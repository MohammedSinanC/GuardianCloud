import Invoice from "../models/invoice.model.js";
import Quotation from "../models/quotation.model.js";
import Inquiry from "../models/inquiry.model.js";
import Lead from "../models/lead.model.js";
import Customer from "../models/customer.model.js";
import Company from "../models/company.model.js";
import WorkOrder from "../models/work-order.model.js";
import { generatePdf } from "../utils/pdf.js";
import { sendMail } from "../utils/mailer.js";
import { postLedgerTransaction } from "./ledger.controller.js";
import { withTransaction } from "../utils/tx.js";
import { actor as workflowActor, recordHistory } from "../services/document-workflow.service.js";

// ===== Helpers =====

function actor(req) {
  return { id: req.admin?._id || null, name: req.admin?.name || req.admin?.username || "" };
}

async function buildInvoicePdfData(invoiceId) {
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) throw new Error("Invoice not found");
  const quotation = invoice.quotationId ? await Quotation.findById(invoice.quotationId).lean() : null;
  const inquiry = await Inquiry.findById(invoice.inquiryId).lean();
  const lead = invoice.leadId ? await Lead.findById(invoice.leadId).lean() : null;
  const customer = invoice.customerId ? await Customer.findById(invoice.customerId).lean() : null;
  const company = (await Company.findOne({ isActive: true }).lean()) || {};

  return {
    company: {
      name: company.name || "GreenCloud",
      tagline: company.tagline || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      taxNumber: company.taxNumber || "",
      commercialRegistration: company.commercialRegistration || "",
    },
    invoice: {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB") : "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "",
      currency: invoice.currency || "AED",
      status: invoice.status || "DRAFT",
      subtotal: Number(invoice.subtotal || 0).toFixed(2),
      taxRate: invoice.taxRate,
      taxAmount: Number(invoice.taxAmount || 0).toFixed(2),
      discount: Number(invoice.discount || 0).toFixed(2),
      totalAmount: Number(invoice.totalAmount || 0).toFixed(2),
      paymentTerms: invoice.paymentTerms || "",
      bankDetails: invoice.bankDetails || "",
      notes: invoice.notes || "",
      paymentTypeName: quotation?.paymentTypeName || "",
    },
    customer: {
      companyName: customer?.companyName || inquiry?.customerName || "",
      contactPerson: customer?.contactPerson || inquiry?.contactPerson || "",
      mobile: customer?.mobile || inquiry?.mobile || "",
      email: customer?.email || inquiry?.email || "",
      address: customer?.address || "",
      location: customer?.location || "",
      customerCode: customer?.customerCode || "",
      trnNumber: customer?.trnNumber || "",
    },
    leadNo: lead?.leadNo || "",
    inquiryNo: inquiry?.inquiryNo || "",
    quotationNo: quotation?.quotationNo || "",
    items: invoice.items || [],
  };
}

/**
 * POST /api/invoices — create from an APPROVED quotation (rule #8).
 * Body: { quotationId, dueDate?, notes?, bankDetails?, paymentTerms? }
 * Idempotent: one invoice per quotation.
 */
export async function create(req, res) {
  try {
    const { quotationId, workOrderId } = req.body;
    if (!quotationId && !workOrderId) {
      return res.status(400).json({ success: false, message: "quotationId or workOrderId is required" });
    }
    if (!workOrderId) {
      return res.status(400).json({ success: false, message: "workOrderId is required; invoices are created only after work completion" });
    }
    const workOrder = await WorkOrder.findById(workOrderId).lean();
    if (!workOrder || workOrder.status !== "WORK_COMPLETED") {
      return res.status(400).json({ success: false, message: "Invoice can only be created after work is completed" });
    }
    const quotation = await Quotation.findById(quotationId || workOrder?.quotationId).lean();
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
    if (quotation.status !== "APPROVED") {
      return res.status(400).json({ success: false, message: "Invoice can only be created from an APPROVED quotation" });
    }

    const existing = await Invoice.findOne({ workOrderId });
    if (existing) {
      return res.status(409).json({ success: false, message: "An invoice already exists for this quotation", data: existing });
    }

    const inquiry = await Inquiry.findById(quotation.inquiryId).lean();
    const a = actor(req);

    const invData = {
      workOrderId: workOrder?._id || null,
      quotationId: quotation._id,
      leadId: quotation.leadId || inquiry?.leadId || null,
      customerId: quotation.customerId || inquiry?.erpCustomerId || null,
      items: quotation.items,
      taxRate: quotation.taxRate,
      currency: quotation.currency,
      dueDate: req.body.dueDate || null,
      notes: req.body.notes || "",
      bankDetails: req.body.bankDetails || "",
      paymentTerms: req.body.paymentTerms || quotation.terms || "",
      status: "DRAFT",
      ledgerAccountId: quotation.customerId ? (await Customer.findById(quotation.customerId).select("ledgerId").lean())?.ledgerId || null : null,
      createdBy: a.id,
      updatedBy: a.id,
    };

    const invoice = await withTransaction(async (session) => {
      const inv = session
        ? (await Invoice.create([invData], { session }))[0]
        : await Invoice.create(invData);

      await Inquiry.updateOne({ _id: quotation.inquiryId }, { $set: { invoiceId: inv._id } }, session ? { session } : {});
      if (workOrder?._id) await WorkOrder.updateOne({ _id: workOrder._id }, { $set: { invoiceId: inv._id } }, session ? { session } : {});
      await recordHistory({ documentType: "INVOICE", documentId: inv._id, action: "CREATED", newStatus: "DRAFT", actorId: a.id, actorName: a.name, session });
      return inv;
    });

    res.status(201).json({ success: true, data: invoice, message: "Invoice created successfully" });
  } catch (err) {
    console.error("Create invoice error:", err);
    res.status(500).json({ success: false, message: `Invoice could not be created: ${err.message}` });
  }
}

/**
 * POST /api/invoices/:id/approve — approve and post the ledger debit (rule #9).
 * Idempotent: re-approval does not duplicate the ledger entry.
 */
export async function approve(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "APPROVED") {
      return res.json({ success: true, data: invoice, message: "Invoice was already approved", alreadyApproved: true });
    }
    if (!["DRAFT", "PENDING_APPROVAL"].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: `Only draft or pending invoices can be approved (current: ${invoice.status})` });
    }
    if (!invoice.customerId) {
      return res.status(400).json({ success: false, message: "Invoice has no ERP customer linked" });
    }
    const a = workflowActor(req);
    const old = invoice.status;
    invoice.status = "APPROVED";
    invoice.approvedBy = a.id;
    invoice.approvedDate = new Date();
    invoice.updatedBy = a.id;
    await invoice.save();
    await recordHistory({ documentType: "INVOICE", documentId: invoice._id, action: "APPROVED", oldStatus: old, newStatus: "APPROVED", actorId: a.id, actorName: a.name });
    res.json({ success: true, data: invoice, message: "Invoice approved successfully" });
  } catch (err) {
    console.error("Approve invoice error:", err);
    res.status(500).json({ success: false, message: `Unable to approve invoice: ${err.message}` });
  }
}

export async function reject(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (!["DRAFT", "PENDING_APPROVAL"].includes(invoice.status)) return res.status(400).json({ success: false, message: "Invoice cannot be rejected in its current status" });
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" });
    const a = workflowActor(req); const old = invoice.status;
    invoice.status = "CANCELLED"; invoice.rejectionReason = reason; invoice.rejectedBy = a.id; invoice.rejectedDate = new Date(); invoice.updatedBy = a.id; await invoice.save();
    await recordHistory({ documentType: "INVOICE", documentId: invoice._id, action: "REJECTED", oldStatus: old, newStatus: "CANCELLED", actorId: a.id, actorName: a.name, remarks: reason });
    res.json({ success: true, data: invoice });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function post(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "POSTED") return res.json({ success: true, data: invoice, alreadyPosted: true });
    if (invoice.status !== "APPROVED") return res.status(400).json({ success: false, message: "Only approved invoices can be posted" });
    if (!invoice.customerId) return res.status(400).json({ success: false, message: "Invoice has no customer linked" });
    const a = workflowActor(req);
    const { default: LedgerTransaction } = await import("../models/ledger-transaction.model.js");
    let tx = await LedgerTransaction.findOne({ invoiceId: invoice._id, type: "INVOICE" });
    if (!tx) tx = await postLedgerTransaction({ customerId: invoice.customerId, type: "INVOICE", debit: invoice.totalAmount, referenceNo: invoice.invoiceNo, description: `Invoice ${invoice.invoiceNo}`, invoiceId: invoice._id, quotationId: invoice.quotationId, leadId: invoice.leadId, inquiryId: invoice.inquiryId, actorId: a.id, actorName: a.name });
    invoice.status = "POSTED"; invoice.postedBy = a.id; invoice.postedAt = new Date(); invoice.ledgerTransactionId = tx._id; invoice.updatedBy = a.id; await invoice.save();
    await recordHistory({ documentType: "INVOICE", documentId: invoice._id, action: "POSTED", oldStatus: "APPROVED", newStatus: "POSTED", actorId: a.id, actorName: a.name });
    res.json({ success: true, data: invoice, ledgerTransactionId: tx._id });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}


export async function cancel(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "A paid invoice cannot be cancelled" });
    }
    if (invoice.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Invoice is already cancelled" });
    }

    const a = actor(req);
    const wasApproved = invoice.status === "APPROVED";
    invoice.status = "CANCELLED";
    invoice.updatedBy = a.id;
    await invoice.save();

    // Reverse the ledger debit if it was already posted
    if (wasApproved && invoice.customerId) {
      await postLedgerTransaction({
        customerId: invoice.customerId,
        type: "ADJUSTMENT",
        debit: 0,
        credit: invoice.totalAmount,
        referenceNo: invoice.invoiceNo,
        description: `Cancellation reversal for invoice ${invoice.invoiceNo}`,
        invoiceId: invoice._id,
        actorId: a.id,
        actorName: a.name,
      });
    }
    res.json({ success: true, data: invoice, message: "Invoice cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/invoices — list */
export async function list(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ invoiceNo: rx }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
        .populate("quotationId", "quotationNo")
        .populate("customerId", "companyName customerCode")
        .lean(),
      Invoice.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/invoices/:id — details with chain references */
export async function getById(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("quotationId", "quotationNo totalAmount status")
      .populate("customerId", "companyName customerCode email mobile")
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const inquiry = invoice.inquiryId ? await Inquiry.findById(invoice.inquiryId).select("inquiryNo leadId").lean() : null;
    const lead = invoice.leadId ? await Lead.findById(invoice.leadId).select("leadNo").lean() : null;
    res.json({
      success: true,
      data: {
        ...invoice,
        inquiryNo: inquiry?.inquiryNo || "",
        leadNo: lead?.leadNo || "",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/invoices/:id/pdf */
export async function pdf(req, res) {
  try {
    const data = await buildInvoicePdfData(req.params.id);
    const pdfBuffer = await generatePdf("invoice", data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${data.invoice.invoiceNo}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("Invoice PDF error:", err);
    res.status(500).json({ success: false, message: `PDF generation failed: ${err.message}` });
  }
}

/** POST /api/invoices/:id/send */
export async function send(req, res) {
  try {
    const data = await buildInvoicePdfData(req.params.id);
    if (!data.customer.email) {
      return res.status(400).json({ success: false, message: "Customer has no email address on file" });
    }
    const pdfBuffer = await generatePdf("invoice", data);
    const { sent, error } = await sendMail({
      to: data.customer.email,
      subject: `Invoice ${data.invoice.invoiceNo} — ${data.company.name}`,
      html: `<p>Dear ${data.customer.contactPerson || data.customer.companyName},</p>
<p>Please find attached invoice <b>${data.invoice.invoiceNo}</b> for <b>${data.invoice.totalAmount} ${data.invoice.currency}</b>.</p>
<p>Regards,<br/>${data.company.name}</p>`,
      attachments: [{
        filename: `${data.invoice.invoiceNo}.pdf`,
        content: Buffer.from(pdfBuffer),
      }],
    });
    if (!sent) {
      return res.status(500).json({ success: false, message: `Unable to send invoice to customer: ${error}` });
    }
    res.json({ success: true, message: "Invoice sent to customer successfully" });
  } catch (err) {
    console.error("Send invoice error:", err);
    res.status(500).json({ success: false, message: `Unable to send invoice to customer: ${err.message}` });
  }
}
