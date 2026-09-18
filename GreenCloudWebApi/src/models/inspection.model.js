import mongoose from "mongoose";

const inspectionSchema = new mongoose.Schema(
  {
    inspectionNo: { type: String, unique: true, sparse: true, trim: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, index: true },
    workflowCode: { type: String, default: "PEST_CONTROL" },
    currentStageCode: { type: String, default: "INSPECTION_SCHEDULED", trim: true },
    
    // Inspection Details
    inspectionDate: { type: Date, default: null },
    inspectorName: { type: String, default: "" },
    inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    
    // Findings
    pestsFound: [{ type: String }],
    severityLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    affectedAreas: [{ type: String }],
    findings: { type: String, default: "" },
    recommendations: { type: String, default: "" },
    
    // Attachments
    attachments: [{
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      fileType: { type: String, default: "" },
      uploadedAt: { type: Date, default: Date.now },
    }],

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, collection: "inspections" }
);

inspectionSchema.pre("save", async function (next) {
  if (this.isNew && !this.inspectionNo) {
    const count = await mongoose.model("inspections").countDocuments();
    const year = new Date().getFullYear();
    this.inspectionNo = `INS-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("inspections", inspectionSchema);
