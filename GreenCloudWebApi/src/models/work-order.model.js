import mongoose from "mongoose";

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNo: { type: String, unique: true, sparse: true, trim: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", required: true, index: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null, index: true },
    inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: "site_inspections", default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "invoices", default: null, index: true },
    serviceType: { type: String, default: "" },
    serviceLocation: { type: String, default: "" },
    assignedTeam: { type: String, default: "" },
    assignedTechnician: { type: String, default: "" },
    scheduledDate: { type: Date, default: null },
    scheduledTime: { type: String, default: "" },
    workDescription: { type: String, default: "" },
    requiredMaterials: { type: String, default: "" },
    remarks: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    startedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    completionNotes: { type: String, default: "" },
    materialsUsed: { type: String, default: "" },
    customerConfirmation: { type: String, default: "" },
    attachments: [{ fileName: String, fileUrl: String, fileType: String, uploadedAt: { type: Date, default: Date.now } }],
    /** Work-start evidence: images converted to base64 data URLs on the client. */
    workStartEvidence: [{ fileName: String, data: String, uploadedAt: { type: Date, default: Date.now } }],
    /** Work-completion evidence: images converted to base64 data URLs on the client. */
    workCompletionEvidence: [{ fileName: String, data: String, uploadedAt: { type: Date, default: Date.now } }],
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "WORK_STARTED", "WORK_COMPLETED", "REJECTED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByName: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByName: { type: String, default: "" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    approvedDate: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    rejectedDate: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true, collection: "work_orders" }
);

workOrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.workOrderNo) {
    const count = await mongoose.model("work_orders").countDocuments();
    this.workOrderNo = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("work_orders", workOrderSchema);
