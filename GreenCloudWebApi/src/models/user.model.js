import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Workflow
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      default: null,
    },
    currentStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowStage",
      default: null,
    },
    currentStageCode: {
      type: String,
      default: "CREATED",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "on_hold"],
      default: "active",
    },

    // Request Details
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    service: {
      type: String,
      required: [true, "Service is required"],
      trim: true,
    },
    contract: {
      type: String,
      required: [true, "Contract is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    preferredDate: {
      type: Date,
      required: false,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },

    // Metadata
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assignedTo: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: String,
      default: "system",
    },
    updatedBy: {
      type: String,
      default: "system",
    },
  },
  {
    timestamps: true,
    collection: "service_requests",
  }
);

// Auto-generate request number
serviceRequestSchema.pre("save", async function (next) {
  if (this.isNew && !this.requestNumber) {
    const count = await mongoose.model("service_requests").countDocuments();
    this.requestNumber = `SR-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

const ServiceRequest = mongoose.model(
  "service_requests",
  serviceRequestSchema
);

export default ServiceRequest;
