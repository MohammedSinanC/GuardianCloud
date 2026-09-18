import mongoose from "mongoose";

// ============ PAYMENT TYPE MASTER ============
const paymentTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    frequency: {
      type: String,
      enum: ["MONTHLY", "HALF_YEARLY", "YEARLY", "ONE_TIME", "CUSTOM"],
      required: true,
    },
    interval: { type: Number, default: 1, min: 0 }, // months between payments
    gracePeriodDays: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, collection: "payment_type_masters" }
);

// ============ PAYMENT SCHEDULE ============
const paymentScheduleSchema = new mongoose.Schema(
  {
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "quotations", required: true, index: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "inquiries", required: true, index: true },
    paymentNo: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paymentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "payment_type_masters", default: null },
    paymentTypeName: { type: String, default: "" },
    paymentFrequency: { type: String, default: "" },
    amount: { type: Number, required: true },
    vat: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    intervalMonths: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"],
      default: "PENDING",
    },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paidDate: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true, collection: "payment_schedules" }
);

paymentScheduleSchema.index({ quotationId: 1, paymentNo: 1 });

export const PaymentTypeMaster = mongoose.model("PaymentTypeMaster", paymentTypeSchema);
export const PaymentSchedule = mongoose.model("PaymentSchedule", paymentScheduleSchema);
