import Invoice from "../models/invoice.model.js";
import Receipt from "../models/receipt.model.js";
import Company from "../models/company.model.js";
import Customer from "../models/customer.model.js";
import { PaymentSchedule, PaymentTypeMaster } from "../models/payment.model.js";
import LedgerTransaction from "../models/ledger-transaction.model.js";
import { postLedgerTransaction } from "./ledger.controller.js";
import { withTransaction } from "../utils/tx.js";
import { actor, recordHistory } from "../services/document-workflow.service.js";
import { renderHtml, renderPdf } from "../utils/pdf.js";

/**
 * Invoice Payment & Collection workflow.
 *
 * Flow (rule #9): Invoice Created → Select Payment Type → Terms auto-loaded →
 * Schedule auto-generated (amounts, %, dates, grace) → Review → Approve →
 * Collect Payment → Receipt → Invoice balance → Ledger credit.
 *
 * Everything downstream of the Payment Type selection is automatic; approval is
 * gated on the plan existing and totaling the invoice; collection is one
 * controlled transaction (receipt + installment + invoice + ledger).
 */

/**
 * Build installment rows for an invoice from a payment type configuration.
 * Percentages come from the type's custom installmentPlan (e.g. [30, 40, 30]);
 * otherwise installments split equally across the frequency's payment count.
 * Amounts are cent-accurate — the last installment absorbs rounding.
 */
export function buildInstallments(invoice, paymentType) {
  const total = Math.round((Number(invoice.totalAmount) || 0) * 100) / 100;
  const plan = (paymentType.installmentPlan || []).filter((p) => Number(p) > 0);
  const frequency = paymentType.frequency || "ONE_TIME";

  let count;
  let intervalMonths = Math.max(paymentType.interval || 0, 0);
  if (plan.length > 0) {
    count = plan.length;
  } else if (frequency === "ONE_TIME") {
    count = 1;
  } else if (frequency === "MONTHLY") {
    count = 12;
    intervalMonths = intervalMonths || 1;
  } else if (frequency === "QUARTERLY") {
    count = 4;
    intervalMonths = intervalMonths || 3;
  } else if (frequency === "HALF_YEARLY") {
    count = 2;
    intervalMonths = intervalMonths || 6;
  } else if (frequency === "YEARLY") {
    count = 1;
    intervalMonths = intervalMonths || 12;
  } else {
    intervalMonths = Math.max(intervalMonths, 1);
    count = Math.max(Math.round(12 / intervalMonths), 1);
  }
  count = Math.max(count, 1);

  const graceDays = Math.max(paymentType.gracePeriodDays || 0, 0);
  const startDate = new Date();

  const percentages =
    plan.length > 0
      ? plan
      : Array.from({ length: count }, () => Math.round((100 / count) * 10000) / 10000);
  const pctSum = percentages.reduce((s, p) => s + Number(p), 0);
  if (Math.abs(pctSum - 100) > 0.01) {
    throw new Error(`Installment percentages must total 100% (currently ${pctSum}%)`);
  }

  const rows = [];
  let running = 0;
  for (let i = 0; i < count; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + intervalMonths * i);
    const dueDate = new Date(paymentDate);
    const finalDueDate = new Date(dueDate);
    finalDueDate.setDate(finalDueDate.getDate() + graceDays);

    const isLast = i === count - 1;
    const amount = isLast
      ? Math.round((total - running) * 100) / 100
      : Math.round(total * (Number(percentages[i]) / 100) * 100) / 100;
    if (!isLast) running += amount;

    rows.push({
      paymentNo: i + 1,
      percentage: Math.round(Number(percentages[i]) * 100) / 100,
      paymentDate,
      dueDate,
      graceDays,
      finalDueDate,
      amount,
    });
  }
  return rows;
}

/**
 * Derived display status: Upcoming / Grace Period / Overdue / Paid / Partially Paid.
 * A partially-paid installment shows PARTIALLY_PAID as its state (per spec §7);
 * collection risk for unpaid balances past due is surfaced via the overdue summary.
 */
export function deriveScheduleStatus(row, now = new Date()) {
  if (row.status === "CANCELLED") return "CANCELLED";
  const outstanding = Math.max((Number(row.amount) || 0) - (Number(row.paidAmount) || 0), 0);
  if (outstanding <= 0.009) return "PAID";
  if ((Number(row.paidAmount) || 0) > 0.009) return "PARTIALLY_PAID";
  const due = row.dueDate ? new Date(row.dueDate) : null;
  const final = row.finalDueDate ? new Date(row.finalDueDate) : due;
  // Date-level comparison: an installment due today is still "upcoming", not overdue.
  const dueEod = due ? new Date(due).setHours(23, 59, 59, 999) : null;
  const finalEod = final ? new Date(final).setHours(23, 59, 59, 999) : dueEod;
  if (dueEod && now.getTime() <= dueEod) return "UPCOMING";
  if (finalEod && now.getTime() <= finalEod) return "GRACE_PERIOD";
  return "OVERDUE";
}

/**
 * PUT /api/invoices/:id/payment-type — select the payment type, load its terms
 * onto the invoice and generate the invoice-scoped schedule in one controlled
 * call. Unpaid rows are replaced; paid/partial rows survive regeneration.
 */
export async function selectPaymentType(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (!["DRAFT", "PENDING_APPROVAL"].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: `Payment type can only be selected before approval (current: ${invoice.status})` });
    }
    const paymentType = await PaymentTypeMaster.findById(req.body?.paymentTypeId);
    if (!paymentType || !paymentType.isActive) {
      return res.status(400).json({ success: false, message: "A valid active Payment Type is required" });
    }

    const installments = buildInstallments(invoice, paymentType);
    const sum = Math.round(installments.reduce((s, i) => s + i.amount, 0) * 100) / 100;
    const total = Math.round((Number(invoice.totalAmount) || 0) * 100) / 100;
    if (Math.abs(sum - total) > 0.01) {
      return res.status(400).json({ success: false, message: `Generated schedule total (${sum.toFixed(2)}) does not match the invoice total (${total.toFixed(2)})` });
    }

    const a = actor(req);
    invoice.paymentTypeId = paymentType._id;
    invoice.paymentTypeName = paymentType.name;
    invoice.paymentTermsPlan = {
      frequency: paymentType.frequency,
      numberOfPayments: installments.length,
      intervalMonths: Math.max(paymentType.interval || 0, 0),
      gracePeriodDays: Math.max(paymentType.gracePeriodDays || 0, 0),
      installmentPlan: (paymentType.installmentPlan || []).filter((p) => Number(p) > 0),
    };
    invoice.updatedBy = a.id;
    await invoice.save();

    await PaymentSchedule.deleteMany({ invoiceId: invoice._id, status: { $nin: ["PAID", "PARTIALLY_PAID"] } });
    await PaymentSchedule.insertMany(
      installments.map((i) => ({
        quotationId: invoice.quotationId,
        inquiryId: invoice.inquiryId,
        invoiceId: invoice._id,
        paymentNo: i.paymentNo,
        paymentDate: i.paymentDate,
        dueDate: i.dueDate,
        finalDueDate: i.finalDueDate,
        percentage: i.percentage,
        graceDays: i.graceDays,
        amount: i.amount,
        vat: 0,
        total: i.amount,
        paymentTypeId: paymentType._id,
        paymentTypeName: paymentType.name,
        paymentFrequency: paymentType.frequency,
        intervalMonths: Math.max(paymentType.interval || 0, 0),
        status: "PENDING",
        paidAmount: 0,
        remainingAmount: i.amount,
      })),
    );

    res.json({ success: true, message: "Payment type selected — terms loaded and payment schedule generated", data: invoice });
  } catch (err) {
    console.error("Select payment type error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
}

/** GET /api/invoices/:id/payment-schedule — schedule + derived statuses + collection summary + receipts. */
export async function getInvoiceSchedule(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const rows = await PaymentSchedule.find({ invoiceId: invoice._id }).sort({ paymentNo: 1 }).lean();
    const now = new Date();
    const withStatus = rows.map((r) => ({
      ...r,
      outstandingAmount: Math.round(Math.max((Number(r.amount) || 0) - (Number(r.paidAmount) || 0), 0) * 100) / 100,
      derivedStatus: deriveScheduleStatus(r, now),
    }));
    const summary = {
      totalScheduled: Math.round(withStatus.filter((r) => r.status !== "CANCELLED").reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100,
      totalReceived: Math.round(withStatus.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0) * 100) / 100,
      totalOutstanding: Math.round(withStatus.filter((r) => r.status !== "CANCELLED").reduce((s, r) => s + r.outstandingAmount, 0) * 100) / 100,
      overdueAmount: Math.round(withStatus.filter((r) => r.derivedStatus === "OVERDUE").reduce((s, r) => s + r.outstandingAmount, 0) * 100) / 100,
      next: withStatus.filter((r) => ["UPCOMING", "GRACE_PERIOD"].includes(r.derivedStatus)).sort((a, b) => a.paymentNo - b.paymentNo)[0] || null,
    };
    const receipts = await Receipt.find({ invoiceId: invoice._id, status: { $ne: "CANCELLED" } }).sort({ receiptDate: -1 }).lean();
    res.json({ success: true, data: { schedule: withStatus, summary, receipts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/invoices/:id/collect — record a payment against one installment.
 * One controlled transaction: receipt + installment update + invoice balance +
 * ledger credit, all linked. Duplicate-safe (referenceNo) and partial-aware.
 */
export async function collectPayment(req, res) {
  try {
    const { scheduleId, amount, paymentMethod, referenceNo, remarks, paymentDate } = req.body || {};
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot collect payments on a cancelled invoice" });
    }
    const row = await PaymentSchedule.findById(scheduleId);
    if (!row || String(row.invoiceId) !== String(invoice._id)) {
      return res.status(404).json({ success: false, message: "Payment schedule installment not found for this invoice" });
    }

    const outstandingRow = Math.round((Number(row.amount) - (Number(row.paidAmount) || 0)) * 100) / 100;
    const pay = Math.round((Number(amount) || 0) * 100) / 100;
    if (!(pay > 0)) return res.status(400).json({ success: false, message: "Payment amount must be greater than zero" });
    if (pay > outstandingRow + 0.009) {
      return res.status(400).json({ success: false, message: `Payment (${pay.toFixed(2)}) exceeds the installment outstanding amount (${outstandingRow.toFixed(2)})` });
    }
    const invoiceOutstanding = Math.round((Number(invoice.totalAmount) - (Number(invoice.amountPaid) || 0)) * 100) / 100;
    if (pay > invoiceOutstanding + 0.009) {
      return res.status(400).json({ success: false, message: `Payment (${pay.toFixed(2)}) exceeds the invoice outstanding amount (${invoiceOutstanding.toFixed(2)})` });
    }
    if (String(referenceNo || "").trim()) {
      const dup = await Receipt.findOne({ referenceNo: String(referenceNo).trim(), status: { $ne: "CANCELLED" } });
      if (dup) return res.status(409).json({ success: false, message: `A receipt with reference "${referenceNo}" already exists (${dup.receiptNo}) — duplicate payments are not allowed` });
    }

    const a = actor(req);
    const method = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"].includes(paymentMethod) ? paymentMethod : "OTHER";

    // Receipt requires the customer's ledger account — fall back to the lookup
    // by customer when the invoice itself doesn't carry one.
    let ledgerAccountId = invoice.ledgerAccountId;
    if (!ledgerAccountId) {
      const { default: AccountLedger } = await import("../models/ledger.model.js");
      const ledger = await AccountLedger.findOne({ customerId: invoice.customerId }).select("_id").lean();
      if (!ledger) return res.status(400).json({ success: false, message: "Customer account ledger not found — cannot record the payment" });
      ledgerAccountId = ledger._id;
    }

    const result = await withTransaction(async (session) => {
      const receipt = (await Receipt.create([{
        customerId: invoice.customerId,
        ledgerAccountId,
        invoiceId: invoice._id,
        paymentScheduleId: row._id,
        paymentMethod: method,
        amount: pay,
        referenceNo: String(referenceNo || "").trim(),
        remarks: String(remarks || ""),
        receiptDate: paymentDate ? new Date(paymentDate) : new Date(),
        status: "POSTED",
        postedBy: a.id,
        postedAt: new Date(),
        createdBy: a.id,
        createdByName: a.name,
      }], { session }))[0];

      row.paidAmount = Math.round(((Number(row.paidAmount) || 0) + pay) * 100) / 100;
      row.remainingAmount = Math.round(Math.max(Number(row.amount) - row.paidAmount, 0) * 100) / 100;
      row.paidDate = row.paidDate || receipt.receiptDate;
      if (row.remainingAmount <= 0.009) { row.status = "PAID"; row.remainingAmount = 0; }
      else { row.status = "PARTIALLY_PAID"; }
      await row.save({ session });

      invoice.amountPaid = Math.round(((Number(invoice.amountPaid) || 0) + pay) * 100) / 100;
      invoice.outstandingAmount = Math.round(Math.max(Number(invoice.totalAmount) - invoice.amountPaid, 0) * 100) / 100;
      invoice.paymentStatus = invoice.outstandingAmount <= 0.009 ? "PAID" : "PARTIAL";
      if (invoice.outstandingAmount > 0.009 && !["DRAFT", "PENDING_APPROVAL"].includes(invoice.status)) {
        invoice.status = "PARTIALLY_PAID";
      }
      await invoice.save({ session });

      const tx = await postLedgerTransaction({
        customerId: invoice.customerId,
        type: "PAYMENT",
        credit: pay,
        referenceNo: receipt.receiptNo,
        description: `Payment received for ${invoice.invoiceNo} (installment ${row.paymentNo})`,
        invoiceId: invoice._id,
        quotationId: invoice.quotationId,
        inquiryId: invoice.inquiryId,
        actorId: a.id,
        actorName: a.name,
        transactionDate: receipt.receiptDate,
        session,
      });
      if (tx?._id) {
        await LedgerTransaction.updateOne({ _id: tx._id }, { $set: { paymentScheduleId: row._id, receiptId: receipt._id } }, { session });
      }

      await recordHistory({ documentType: "RECEIPT", documentId: receipt._id, action: "PAYMENT_RECEIVED", oldStatus: "NEW", newStatus: "POSTED", actorId: a.id, actorName: a.name, remarks: `${invoice.invoiceNo} · installment ${row.paymentNo} · ${pay}`, session });
      return { receipt, ledgerTxId: tx?._id || null };
    });

    res.json({
      success: true,
      message: `Payment of ${pay.toFixed(2)} recorded — receipt ${result.receipt.receiptNo} generated`,
      data: { receipt: result.receipt, ledgerTransactionId: result.ledgerTxId },
    });
  } catch (err) {
    console.error("Collect payment error:", err);
    res.status(500).json({ success: false, message: `Payment could not be recorded: ${err.message}` });
  }
}

/** GET /api/invoices/:id/receipts/:receiptId/pdf — printable payment receipt. */
export async function receiptPdf(req, res) {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.receiptId, invoiceId: req.params.id }).lean();
    if (!receipt) return res.status(404).json({ success: false, message: "Receipt not found" });
    const [invoice, customer, scheduleRow] = await Promise.all([
      receipt.invoiceId ? Invoice.findById(receipt.invoiceId).lean() : null,
      Customer.findById(receipt.customerId).lean(),
      receipt.paymentScheduleId ? PaymentSchedule.findById(receipt.paymentScheduleId).lean() : null,
    ]);
    const company = (await Company.findOne({ isActive: true }).lean()) || {};
    const outstanding = invoice
      ? Math.round(Math.max((Number(invoice.totalAmount) || 0) - (Number(invoice.amountPaid) || 0), 0) * 100) / 100
      : null;
    const html = renderHtml("receipt", {
      company,
      receipt,
      invoice: invoice || null,
      customer: customer || null,
      installment: scheduleRow
        ? {
            no: scheduleRow.paymentNo,
            total: scheduleRow.amount,
            outstanding: Math.round(Math.max((Number(scheduleRow.amount) || 0) - (Number(scheduleRow.paidAmount) || 0), 0) * 100) / 100,
          }
        : null,
      invoiceOutstanding: outstanding,
    });
    const pdfBuffer = await renderPdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${receipt.receiptNo}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("Receipt PDF error:", err);
    res.status(500).json({ success: false, message: `Receipt PDF failed: ${err.message}` });
  }
}
