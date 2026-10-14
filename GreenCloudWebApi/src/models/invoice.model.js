import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true, sparse: true, trim: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "work_orders", default: null, index: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", default: null },
    // ERP chain refs
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", default: null, index: true },
    ledgerAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "account_ledgers", default: null, index: true },
    status: { type: String, enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"], default: "DRAFT", index: true },
    // Payment & collection workflow: the selected payment type drives the
    // installment plan generated for this invoice.
    paymentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "payment_type_masters", default: null },
    paymentTypeName: { type: String, default: "" },
    paymentTermsPlan: {
      frequency: { type: String, default: "" },
      numberOfPayments: { type: Number, default: 0 },
      intervalMonths: { type: Number, default: 0 },
      gracePeriodDays: { type: Number, default: 0 },
      installmentPlan: [{ type: Number }],
    },
    paymentTerms: { type: String, default: "" },
    bankDetails: { type: String, default: "" },
    reference: { type: String, default: "" },
    serviceJobId: { type: mongoose.Schema.Types.ObjectId, ref: "service_jobs", default: null },
    workflowCode: { type: String, default: "PEST_CONTROL" },

    // Invoice Details
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    currency: { type: String, default: "AED" },

    // Line Items
    items: [{
      description: { type: String, default: "" },
      quantity: { type: Number, default: 1 },
      unitPrice: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
    }],

    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 5 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID", "OVERDUE"],
      default: "UNPAID",
    },
    amountPaid: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    paymentDate: { type: Date, default: null },
    paymentMethod: { type: String, default: "" },

    notes: { type: String, default: "" },

    attachments: [{
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      fileType: { type: String, default: "" },
      uploadedAt: { type: Date, default: Date.now },
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByName: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByName: { type: String, default: "" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    approvedDate: { type: Date, default: null },
    postedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    postedAt: { type: Date, default: null },
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "ledger_transactions", default: null },
  },
  { timestamps: true, collection: "invoices" }
);

invoiceSchema.pre("save", async function (next) {
  if (this.isNew && !this.invoiceNo) {
    const count = await mongoose.model("invoices").countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNo = `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  this.items.forEach(item => { item.totalPrice = item.quantity * item.unitPrice; });
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.totalAmount = this.subtotal + this.taxAmount - this.discount;
  this.outstandingAmount = Math.max(this.totalAmount - (this.amountPaid || 0), 0);
  next();
});

export default mongoose.model("invoices", invoiceSchema);
