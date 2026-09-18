import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema({
  inquiryNo: { type: String, unique: true, sparse: true, trim: true },
  inquiryDate: { type: Date, default: Date.now },
  workflowCode: { type: String, default: "PEST_CONTROL", trim: true },
  currentStageCode: { type: String, default: "DRAFT", trim: true, index: true },
  status: { type: String, enum: ["CREATED", "SUBMITTED", "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED", "active", "completed", "cancelled", "rejected"], default: "CREATED", index: true },
  source: { type: String, default: "WEBSITE", trim: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", default: null, index: true },
  erpCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", default: null, index: true },
  customerName: { type: String, trim: true, default: "" },
  companyName: { type: String, trim: true, default: "" },
  contactPerson: { type: String, trim: true, default: "" },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  serviceType: { type: String, trim: true, default: "" },
  contract: { type: String, trim: true, default: "" },
  serviceLocation: { type: String, trim: true, default: "" },
  location: { type: String, trim: true, default: "" },
  building: { type: String, trim: true, default: "" },
  unit: { type: String, trim: true, default: "" },
  area: { type: String, trim: true, default: "" },
  pestTypes: [{ type: String }],
  problemDescription: { type: String, trim: true, default: "" },
  preferredDate: { type: Date, default: null },
  preferredTime: { type: String, trim: true, default: "" },
  siteInspectionRequired: { type: Boolean, default: false },
  // Strictly one Site Inspection per Inquiry — enforced in DB for duplicate prevention
  // (partial: only rows that HAVE an inspectionId get the unique constraint)
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: "site_inspections", default: null, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "admins", default: null },
  assignedToName: { type: String, default: "" },
  attachments: [{ fileName: String, fileUrl: String, fileType: String, uploadedAt: { type: Date, default: Date.now } }],
  remarks: { type: String, trim: true, default: "" },
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: "site_inspections", default: null, index: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", default: null, index: true },
  workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "work_orders", default: null, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "invoices", default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdByName: { type: String, default: "" },
  createdDate: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  updatedByName: { type: String, default: "" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  approvedDate: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  rejectedDate: { type: Date, default: null },
  rejectionReason: { type: String, default: "" },
}, { timestamps: true, collection: "inquiries" });

inquirySchema.pre("save", async function (next) {
  if (this.isNew && !this.inquiryNo) {
    const count = await mongoose.model("inquiries").countDocuments();
    this.inquiryNo = `PCI-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("inquiries", inquirySchema);
