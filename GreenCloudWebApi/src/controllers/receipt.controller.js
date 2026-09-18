import Receipt from "../models/receipt.model.js";
import Invoice from "../models/invoice.model.js";
import AccountLedger from "../models/ledger.model.js";
import { postLedgerTransaction } from "./ledger.controller.js";
import { actor, recordHistory } from "../services/document-workflow.service.js";

export async function create(req, res) {
  try { const a = actor(req); const customerId = req.body.customerId; const ledger = await AccountLedger.findOne({ customerId }); if (!ledger) return res.status(400).json({ success: false, message: "Customer ledger not found" }); const receipt = await Receipt.create({ ...req.body, ledgerAccountId: req.body.ledgerAccountId || ledger._id, createdBy: a.id, createdByName: a.name }); await recordHistory({ documentType: "RECEIPT", documentId: receipt._id, action: "CREATED", newStatus: receipt.status, actorId: a.id, actorName: a.name }); res.status(201).json({ success: true, data: receipt }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function list(req, res) {
  try { const { page = 1, limit = 20, status = "", customerId = "" } = req.query; const filter = {}; if (status) filter.status = status; if (customerId) filter.customerId = customerId; const skip = (Number(page) - 1) * Number(limit); const [data, total] = await Promise.all([Receipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(), Receipt.countDocuments(filter)]); res.json({ success: true, data, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) || 1 } }); } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function getById(req, res) { try { const data = await Receipt.findById(req.params.id).lean(); if (!data) return res.status(404).json({ success: false, message: "Receipt not found" }); res.json({ success: true, data }); } catch (err) { res.status(500).json({ success: false, message: err.message }); } }

export async function post(req, res) {
  try {
    const receipt = await Receipt.findById(req.params.id); if (!receipt) return res.status(404).json({ success: false, message: "Receipt not found" }); if (receipt.status === "POSTED") return res.json({ success: true, data: receipt, alreadyPosted: true }); if (receipt.status !== "DRAFT") return res.status(400).json({ success: false, message: "Only draft receipts can be posted" }); const invoice = receipt.invoiceId ? await Invoice.findById(receipt.invoiceId) : null; if (invoice && receipt.amount > invoice.outstandingAmount) return res.status(400).json({ success: false, message: "Receipt exceeds invoice outstanding amount" }); const a = actor(req); const tx = await postLedgerTransaction({ customerId: receipt.customerId, type: "PAYMENT", credit: receipt.amount, referenceNo: receipt.receiptNo, description: `Receipt ${receipt.receiptNo}`, invoiceId: receipt.invoiceId, actorId: a.id, actorName: a.name, transactionDate: receipt.receiptDate }); receipt.status = "POSTED"; receipt.postedBy = a.id; receipt.postedAt = new Date(); await receipt.save(); if (invoice) { invoice.amountPaid = (invoice.amountPaid || 0) + receipt.amount; invoice.outstandingAmount = Math.max(invoice.totalAmount - invoice.amountPaid, 0); invoice.paymentStatus = invoice.outstandingAmount === 0 ? "PAID" : "PARTIAL"; invoice.status = invoice.outstandingAmount === 0 ? "PAID" : "PARTIALLY_PAID"; await invoice.save(); } await recordHistory({ documentType: "RECEIPT", documentId: receipt._id, action: "PAYMENT_RECEIVED", oldStatus: "DRAFT", newStatus: "POSTED", actorId: a.id, actorName: a.name }); res.json({ success: true, data: receipt, ledgerTransactionId: tx._id });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}
