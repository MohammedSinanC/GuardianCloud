import mongoose from "mongoose";

const ledgerTransactionSchema = new mongoose.Schema(
  {
    ledgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account_ledgers",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["INVOICE", "PAYMENT", "CREDIT", "DEBIT", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    transactionDate: { type: Date, default: Date.now },

    // Cross-document references (rule #20)
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "invoices", default: null, index: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", default: null },

    referenceNo: { type: String, trim: true, default: "" }, // e.g. INV-2026-000001
    description: { type: String, trim: true, default: "" },

    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 }, // running balance snapshot for the ledger screen

    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true, collection: "ledger_transactions" }
);

ledgerTransactionSchema.index({ ledgerId: 1, transactionDate: 1 });

export default mongoose.model("ledger_transactions", ledgerTransactionSchema);
