import mongoose from "mongoose";

// ============ WORKFLOW (Generic) ============
const workflowSchema = new mongoose.Schema(
  {
    workflowCode: { type: String, required: true, unique: true, trim: true },
    workflowName: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: "" },
    createdBy: { type: String, default: "system" },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true, collection: "workflows" }
);

// ============ WORKFLOW STAGE ============
const stageSchema = new mongoose.Schema(
  {
    workflowCode: { type: String, required: true, trim: true, index: true },
    stageCode: { type: String, required: true, trim: true },
    stageName: { type: String, required: true, trim: true },
    sequence: { type: Number, default: 0 },
    isInitial: { type: Boolean, default: false },
    isFinal: { type: Boolean, default: false },
    stageType: {
      type: String,
      enum: ["normal", "terminal", "reject", "hold"],
      default: "normal",
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: "system" },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true, collection: "workflow_stages" }
);

stageSchema.index({ workflowCode: 1, stageCode: 1 }, { unique: true });

// ============ WORKFLOW ACTION ============
const actionSchema = new mongoose.Schema(
  {
    workflowCode: { type: String, required: true, trim: true, index: true },
    stageCode: { type: String, required: true, trim: true },
    actionCode: { type: String, required: true, trim: true },
    actionName: { type: String, required: true, trim: true },
    nextStageCode: { type: String, default: null },
    rejectStageCode: { type: String, default: null },
    buttonColor: { type: String, default: "primary" },
    allowedRoles: [{ type: String, trim: true }],
    requiresComment: { type: Boolean, default: false },
    requiresAttachment: { type: Boolean, default: false },
    mailRequired: { type: Boolean, default: false },
    mailRecipients: { type: String, default: "" },
    mailSubjectTemplate: { type: String, default: "" },
    mailBodyTemplate: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    createdBy: { type: String, default: "system" },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true, collection: "workflow_actions" }
);

actionSchema.index({ workflowCode: 1, stageCode: 1 });

// ============ WORKFLOW HISTORY (Immutable) ============
const historySchema = new mongoose.Schema(
  {
    workflowCode: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fromStageCode: { type: String, default: "" },
    toStageCode: { type: String, default: "" },
    actionCode: { type: String, default: "" },
    actionName: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    performedByName: { type: String, default: "" },
    performedByRole: { type: String, default: "" },
    comment: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "workflow_history" }
);

export const Workflow = mongoose.model("Workflow", workflowSchema);
export const WorkflowStage = mongoose.model("WorkflowStage", stageSchema);
export const WorkflowAction = mongoose.model("WorkflowAction", actionSchema);
export const WorkflowHistory = mongoose.model("WorkflowHistory", historySchema);
