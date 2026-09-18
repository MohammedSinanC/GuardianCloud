import mongoose from "mongoose";

const scheduleChangeSchema = new mongoose.Schema(
  {
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "inquiries",
      required: true,
      index: true,
    },
    inquiryNo: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      default: "SCHEDULE_UPDATED",
    },
    oldPreferredDate: { type: Date, default: null },
    oldPreferredTime: { type: String, default: "" },
    oldUrgency: { type: String, default: "" },
    newPreferredDate: { type: Date, default: null },
    newPreferredTime: { type: String, default: "" },
    newUrgency: { type: String, default: "" },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    changedByName: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "schedule_changes",
  }
);

const ScheduleChangeHistory = mongoose.model(
  "ScheduleChangeHistory",
  scheduleChangeSchema
);

export default ScheduleChangeHistory;
