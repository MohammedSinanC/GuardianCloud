import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  leadNo: { type: String, unique: true, sparse: true, trim: true },
  leadDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"], default: "DRAFT", index: true },
  source: { type: String, enum: ["WEBSITE", "PHONE", "WALK_IN", "REFERRAL", "CAMPAIGN", "OTHER"], default: "PHONE" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", default: null, index: true },
  // When true the lead must be linked to an existing customer account before approval;
  // when false the customer is matched or created automatically on approval.
  existingCustomer: { type: Boolean, default: false },
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", default: null, index: true },
  customerName: { type: String, trim: true, default: "" },
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  address: { type: String, trim: true, default: "" },
  location: { type: String, trim: true, default: "" },
  serviceRequired: { type: String, required: true, trim: true },
  // Selected from the Pest Types master (same field the website contact form uses)
  pestTypes: [{ type: String, trim: true }],
  contract: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "admins", default: null },
  priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
  expectedValue: { type: Number, default: 0 },
  expectedClosingDate: { type: Date, default: null },
  preferredDate: { type: Date, default: null },
  preferredTime: { type: String, default: "" },
  notes: { type: String, trim: true, default: "" },
  remarks: { type: String, trim: true, default: "" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  approvedByName: { type: String, default: "" },
  approvedDate: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  rejectedByName: { type: String, default: "" },
  rejectedDate: { type: Date, default: null },
  rejectionReason: { type: String, default: "" },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  submittedDate: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdByName: { type: String, default: "" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  updatedByName: { type: String, default: "" },
}, { timestamps: true, collection: "leads" });

leadSchema.pre("save", async function (next) {
  if (this.isNew && !this.leadNo) {
    const count = await mongoose.model("leads").countDocuments();
    this.leadNo = `LD-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("leads", leadSchema);
