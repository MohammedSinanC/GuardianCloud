import mongoose from "mongoose";

/**
 * Shared numbering strategy (same pattern as inquiry.model.js → PCI-YYYY-NNNNNN):
 * sequential counter + year prefix. Never hard-coded at call sites.
 */
async function generateInspectionNo() {
  const count = await mongoose.model("site_inspections").countDocuments();
  return `INS-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

const siteInspectionSchema = new mongoose.Schema(
  {
    inspectionNo: { type: String, unique: true, sparse: true, trim: true },
    // Strictly one Site Inspection per Inquiry — unique index below prevents duplicates
    // even under concurrent approve requests (business rule, see ERD workflow).
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, unique: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "customers", required: true, index: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", default: null, index: true },
    inspectionDate: { type: Date, default: null },
    location: { type: String, default: "" },
    inspector: { type: String, default: "" },
    inspectionType: { type: String, default: "" },
    findings: { type: String, default: "" },
    pestType: { type: String, default: "" },
    affectedArea: { type: String, default: "" },
    // Checklist captured during the inspection — rows generated from the
    // Checklist master (Settings → Master Data). controlType decides how the
    // UI renders the input; value holds the checkbox state or text answer.
    checklistItems: [
      {
        code: { type: String, default: "" },
        name: { type: String, default: "" },
        controlType: { type: String, enum: ["TEXTBOX", "CHECKBOX"], default: "TEXTBOX" },
        value: { type: mongoose.Schema.Types.Mixed, default: null },
        remarks: { type: String, default: "" },
      },
    ],
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    recommendations: { type: String, default: "" },
    requiredTreatment: { type: String, default: "" },
    estimatedWork: { type: String, default: "" },
    attachments: [{ fileName: String, fileUrl: String, fileType: String, uploadedAt: { type: Date, default: Date.now } }],
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"], default: "DRAFT", index: true },
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
  { timestamps: true, collection: "site_inspections" }
);

// Business rule: strictly one Site Inspection per Inquiry. The unique index on
// inquiryId enforces this at the DB level; findOne guards in controllers provide
// friendly errors first. NOTE: if legacy data already contains duplicate
// inquiryId rows, drop them once so the index can be created.

// Direct document creation (SiteInspection.create / new + save)
siteInspectionSchema.pre("save", async function (next) {
  if (this.isNew && !this.inspectionNo) {
    this.inspectionNo = await generateInspectionNo();
  }
  next();
});

// Upsert creation (inquiry approve uses findOneAndUpdate + $setOnInsert, which
// bypasses pre("save")). Stamp the generated number into $setOnInsert so it is
// applied only when the upsert actually inserts a new document — updates of an
// existing inspection never get a new number.
siteInspectionSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() || {};
  if (update.$setOnInsert && !update.$setOnInsert.inspectionNo) {
    update.$setOnInsert.inspectionNo = await generateInspectionNo();
    this.setUpdate(update);
  }
});

export default mongoose.model("site_inspections", siteInspectionSchema);
