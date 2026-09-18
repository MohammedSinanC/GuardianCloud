import AccountLedger from "../models/ledger.model.js";
import LedgerTransaction from "../models/ledger-transaction.model.js";
import Customer from "../models/customer.model.js";
import mongoose from "mongoose";

/**
 * Post a transaction to a customer's ledger and update the running balance.
 * Used by invoice approval (debit) and the payment hook (credit).
 * Returns the created transaction.
 */
export async function postLedgerTransaction({ customerId, type, debit = 0, credit = 0, referenceNo = "", description = "", invoiceId = null, quotationId = null, leadId = null, inquiryId = null, actorId = null, actorName = "", transactionDate = new Date() }) {
  const ledger = await AccountLedger.findOne({ customerId });
  if (!ledger) throw new Error(`No ledger found for customer ${customerId}`);

  // Update balance: debit increases what the customer owes, credit reduces it
  const newBalance = Math.round((ledger.currentBalance + debit - credit) * 100) / 100;

  const tx = await LedgerTransaction.create({
    ledgerId: ledger._id,
    customerId,
    type,
    transactionDate,
    invoiceId,
    quotationId,
    leadId,
    inquiryId,
    referenceNo,
    description,
    debit,
    credit,
    balanceAfter: newBalance,
    createdBy: actorId,
    createdByName: actorName,
  });

  ledger.currentBalance = newBalance;
  await ledger.save();
  return tx;
}

/** GET /api/ledgers/:customerId — ledger header + summary (rule #19) */
export async function getLedger(req, res) {
  try {
    const { customerId } = req.params;
    const ledger = await AccountLedger.findOne({ customerId }).lean();
    if (!ledger) return res.status(404).json({ success: false, message: "No ledger found for this customer" });

    const txs = await LedgerTransaction.find({ customerId }).lean();
    const totalDebit = txs.reduce((s, t) => s + (t.debit || 0), 0);
    const totalCredit = txs.reduce((s, t) => s + (t.credit || 0), 0);

    res.json({
      success: true,
      data: {
        ledger,
        summary: {
          openingBalance: ledger.openingBalance,
          totalDebit,
          totalCredit,
          outstandingBalance: ledger.openingBalance + totalDebit - totalCredit,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/ledgers/:customerId/transactions — with date/type/reference filters */
export async function getTransactions(req, res) {
  try {
    const { customerId } = req.params;
    const { dateFrom, dateTo, type, referenceNo } = req.query;

    const filter = { customerId };
    if (type) filter.type = type;
    if (referenceNo) filter.referenceNo = new RegExp(referenceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (dateFrom || dateTo) {
      filter.transactionDate = {};
      if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) filter.transactionDate.$lte = new Date(dateTo + (dateTo.length === 10 ? "T23:59:59.999Z" : ""));
    }

    const txs = await LedgerTransaction.find(filter).sort({ transactionDate: 1, createdAt: 1 }).lean();

    // Recompute running balance across the filtered set (like a bank statement)
    let running = 0;
    const withBalance = txs.map((t) => {
      running += (t.debit || 0) - (t.credit || 0);
      return { ...t, balanceAfter: Math.round(running * 100) / 100 };
    });

    res.json({ success: true, data: withBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
