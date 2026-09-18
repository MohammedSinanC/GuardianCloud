import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, unique: true, sparse: true, trim: true },
    receiptDate: { type: Date, default: Date.now },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", required: true, index: true },
    ledgerAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "account_ledgers", required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "invoices", default: null, index: true },
    paymentScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "payment_schedules", default: null, index: true },
    paymentMethod: { type: String, enum: ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    referenceNo: { type: String, default: "" },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["DRAFT", "POSTED", "CANCELLED"], default: "DRAFT", index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    postedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true, collection: "receipts" }
);

receiptSchema.pre("save", async function (next) {
  if (this.isNew && !this.receiptNo) {
    const count = await mongoose.model("receipts").countDocuments();
    this.receiptNo = `REC-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("receipts", receiptSchema);
