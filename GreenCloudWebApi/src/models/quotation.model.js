import mongoose from "mongoose";

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, unique: true, sparse: true, trim: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, index: true },
    // ERP chain refs
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", default: null, index: true },
    inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: "site_inspections", default: null },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "work_orders", default: null, index: true },
    workflowCode: { type: String, default: "PEST_CONTROL" },
    currentStageCode: { type: String, default: "QUOTATION_PREPARED", trim: true },

    // Quotation Details
    validUntil: { type: Date, default: null },
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
    totalAmount: { type: Number, default: 0 },

    terms: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["DRAFT", "PENDING_APPROVAL", "SENT", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED"], default: "DRAFT", index: true },

    // Payment Configuration
    paymentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentTypeMaster", default: null },
    paymentTypeName: { type: String, default: "" },
    paymentStartDate: { type: Date, default: null },
    paymentEndDate: { type: Date, default: null },
    durationMonths: { type: Number, default: 12 },
    gracePeriodDays: { type: Number, default: 0 },
    customIntervalMonths: { type: Number, default: 1 },
    customPaymentCount: { type: Number, default: 0 },
    numberOfPayments: { type: Number, default: 0 },
    paymentFrequency: { type: String, default: "" },

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
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    rejectedDate: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    remarks: { type: String, default: "" },
  },
  { timestamps: true, collection: "quotations" }
);

quotationSchema.pre("save", async function (next) {
  if (this.isNew && !this.quotationNo) {
    const count = await mongoose.model("quotations").countDocuments();
    const year = new Date().getFullYear();
    this.quotationNo = `QT-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  // Auto-calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  this.items.forEach(item => { item.totalPrice = item.quantity * item.unitPrice; });
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.totalAmount = this.subtotal + this.taxAmount;
  next();
});

export default mongoose.model("quotations", quotationSchema);
