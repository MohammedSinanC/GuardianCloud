import mongoose from "mongoose";

const serviceJobSchema = new mongoose.Schema(
  {
    jobNo: { type: String, unique: true, sparse: true, trim: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, index: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", default: null },
    workflowCode: { type: String, default: "PEST_CONTROL" },
    currentStageCode: { type: String, default: "SERVICE_SCHEDULED", trim: true },

    // Scheduling
    scheduledDate: { type: Date, default: null },
    scheduledTime: { type: String, default: "" },
    
    // Technician Assignment
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    technicianName: { type: String, default: "" },
    teamLead: { type: String, default: "" },

    // Service Details
    serviceType: { type: String, default: "PEST_CONTROL" },
    treatmentAreas: [{ type: String }],
    chemicalsUsed: [{
      name: { type: String, default: "" },
      quantity: { type: String, default: "" },
    }],
    
    // Status
    status: { type: String, enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"], default: "SCHEDULED" },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    
    notes: { type: String, default: "" },

    attachments: [{
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      fileType: { type: String, default: "" },
      uploadedAt: { type: Date, default: Date.now },
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, collection: "service_jobs" }
);

serviceJobSchema.pre("save", async function (next) {
  if (this.isNew && !this.jobNo) {
    const count = await mongoose.model("service_jobs").countDocuments();
    const year = new Date().getFullYear();
    this.jobNo = `SJ-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model("service_jobs", serviceJobSchema);
