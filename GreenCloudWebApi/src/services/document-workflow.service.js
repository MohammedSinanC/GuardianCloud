import { WorkflowHistory } from "../models/workflow.model.js";

export const STATUS_TRANSITIONS = {
  LEAD: {
    DRAFT: ["PENDING_APPROVAL", "REJECTED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    REJECTED: ["DRAFT", "PENDING_APPROVAL", "CANCELLED"],
  },
  INQUIRY: {
    DRAFT: ["PENDING_APPROVAL", "REJECTED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    REJECTED: ["DRAFT", "PENDING_APPROVAL", "CANCELLED"],
  },
  INSPECTION: {
    DRAFT: ["PENDING_APPROVAL", "REJECTED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    REJECTED: ["DRAFT", "PENDING_APPROVAL", "CANCELLED"],
  },
  QUOTATION: {
    DRAFT: ["PENDING_APPROVAL", "REJECTED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    SENT: ["APPROVED", "REJECTED", "CANCELLED"],
    REJECTED: ["DRAFT", "PENDING_APPROVAL", "CANCELLED"],
  },
  WORK_ORDER: {
    DRAFT: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["SCHEDULED", "WORK_STARTED", "CANCELLED"],
    SCHEDULED: ["WORK_STARTED", "CANCELLED"],
    WORK_STARTED: ["WORK_COMPLETED", "CANCELLED"],
    REJECTED: ["DRAFT", "PENDING_APPROVAL", "CANCELLED"],
  },
  INVOICE: {
    DRAFT: ["PENDING_APPROVAL", "APPROVED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "CANCELLED"],
    APPROVED: ["POSTED", "CANCELLED"],
    POSTED: ["PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"],
    PARTIALLY_PAID: ["PAID", "OVERDUE", "CANCELLED"],
    OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  },
};

export function assertTransition(documentType, currentStatus, nextStatus) {
  const allowed = STATUS_TRANSITIONS[documentType]?.[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`${documentType} cannot move from ${currentStatus} to ${nextStatus}`);
  }
}

export async function recordHistory({
  documentType,
  documentId,
  action,
  oldStatus = "",
  newStatus = "",
  actorId = null,
  actorName = "system",
  remarks = "",
  session = null,
}) {
  const payload = {
    workflowCode: "PEST_CONTROL",
    entityType: documentType,
    entityId: documentId,
    fromStageCode: oldStatus,
    toStageCode: newStatus,
    actionCode: action,
    actionName: action,
    performedBy: actorId,
    performedByName: actorName,
    performedByRole: "ADMIN",
    comment: remarks,
  };
  if (session) return (await WorkflowHistory.create([payload], { session }))[0];
  return WorkflowHistory.create(payload);
}

export function actor(req) {
  return {
    id: req.admin?._id || null,
    name: req.admin?.name || req.admin?.username || "system",
  };
}
