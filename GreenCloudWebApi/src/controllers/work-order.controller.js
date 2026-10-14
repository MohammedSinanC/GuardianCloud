import WorkOrder from "../models/work-order.model.js";
import Quotation from "../models/quotation.model.js";
import Invoice from "../models/invoice.model.js";
import { withTransaction } from "../utils/tx.js";
import { actor, assertTransition, recordHistory } from "../services/document-workflow.service.js";

const editable = ["serviceType", "serviceLocation", "assignedTeam", "assignedTechnician", "scheduledDate", "scheduledTime", "workDescription", "requiredMaterials", "remarks", "attachments"];

export async function create(req, res) {
  try {
    const quotation = await Quotation.findById(req.body.quotationId).lean();
    if (!quotation || quotation.status !== "APPROVED") return res.status(400).json({ success: false, message: "Work order must be created from an approved quotation" });
    const a = actor(req); const existing = await WorkOrder.findOne({ quotationId: quotation._id });
    if (existing) return res.json({ success: true, data: existing, alreadyExists: true });
    const order = await WorkOrder.create({ ...req.body, quotationId: quotation._id, inquiryId: quotation.inquiryId, leadId: quotation.leadId, inspectionId: quotation.inspectionId, customerId: quotation.customerId, serviceType: req.body.serviceType || "Pest Control", status: "DRAFT", createdBy: a.id, createdByName: a.name });
    await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "CREATED", newStatus: order.status, actorId: a.id, actorName: a.name });
    res.status(201).json({ success: true, data: order });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

/**
 * Assign the work: team, technician, schedule and description in one call.
 * Allowed while the order has not started yet. Sets status to SCHEDULED on
 * first assignment (DRAFT → SCHEDULED) so the list reflects work being planned.
 */
export async function assign(req, res) {
  try {
    const order = await WorkOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Work order not found" });
    if (['WORK_STARTED', 'WORK_COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)) return res.status(400).json({ success: false, message: "Work order cannot be assigned in its current status" });
    const fields = ["assignedTeam", "assignedTechnician", "scheduledDate", "scheduledTime", "workDescription", "requiredMaterials", "serviceLocation"];
    for (const key of fields) if (key in req.body) order[key] = req.body[key];
    const a = actor(req);
    const old = order.status;
    if (order.status === 'DRAFT') order.status = 'SCHEDULED';
    order.updatedBy = a.id; order.updatedByName = a.name;
    await order.save();
    if (order.status !== old) await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "ASSIGNED", oldStatus: old, newStatus: order.status, actorId: a.id, actorName: a.name });
    res.json({ success: true, data: order });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function list(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "", customerId = "" } = req.query; const filter = {};
    if (status) filter.status = status; if (customerId) filter.customerId = customerId;
    if (search) filter.$or = [{ workOrderNo: { $regex: search, $options: "i" } }, { serviceLocation: { $regex: search, $options: "i" } }, { assignedTechnician: { $regex: search, $options: "i" } }];
    const skip = (Number(page) - 1) * Number(limit); const [data, total] = await Promise.all([WorkOrder.find(filter)
      .populate("customerId", "companyName contactPerson mobile")
      .populate("inquiryId", "inquiryNo customerName companyName mobile serviceLocation location serviceType pestTypes")
      .populate("leadId", "leadNo")
      .populate("quotationId", "quotationNo")
      .populate("inspectionId", "inspectionNo")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(), WorkOrder.countDocuments(filter)]);
    res.json({ success: true, data, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) || 1 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function getById(req, res) {
  try { const order = await WorkOrder.findById(req.params.id).lean(); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); const quotation = order.quotationId ? await Quotation.findById(order.quotationId).populate("inquiryId", "inquiryNo companyName customerName serviceType").populate("customerId", "companyName contactPerson mobile").lean() : null; const { WorkflowHistory } = await import("../models/workflow.model.js"); const history = await WorkflowHistory.find({ entityType: "WORK_ORDER", entityId: order._id }).sort({ createdAt: 1 }).lean(); res.json({ success: true, data: { ...order, quotation, workflowHistory: history } }); } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function update(req, res) {
  try { const order = await WorkOrder.findById(req.params.id); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); if (!["DRAFT", "REJECTED", "PENDING_APPROVAL", "APPROVED", "SCHEDULED"].includes(order.status)) return res.status(400).json({ success: false, message: "Work order cannot be edited in its current status" }); for (const key of editable) if (key in req.body) order[key] = req.body[key]; const a = actor(req); order.updatedBy = a.id; order.updatedByName = a.name; await order.save(); res.json({ success: true, data: order }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function submit(req, res) {
  try { const order = await WorkOrder.findById(req.params.id); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); if (!["DRAFT", "REJECTED"].includes(order.status)) return res.status(400).json({ success: false, message: "Only draft or rejected work orders can be submitted" }); const a = actor(req); const old = order.status; order.status = "PENDING_APPROVAL"; order.updatedBy = a.id; order.updatedByName = a.name; await order.save(); await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "SUBMITTED", oldStatus: old, newStatus: "PENDING_APPROVAL", actorId: a.id, actorName: a.name }); res.json({ success: true, data: order }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function approve(req, res) {
  try { const order = await WorkOrder.findById(req.params.id); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); assertTransition("WORK_ORDER", order.status, "APPROVED"); const a = actor(req); const old = order.status; order.status = "APPROVED"; order.approvedBy = a.id; order.approvedDate = new Date(); order.updatedBy = a.id; await order.save(); await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "APPROVED", oldStatus: old, newStatus: "APPROVED", actorId: a.id, actorName: a.name }); res.json({ success: true, data: order }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function reject(req, res) {
  try { const order = await WorkOrder.findById(req.params.id); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); assertTransition("WORK_ORDER", order.status, "REJECTED"); const reason = String(req.body?.reason || "").trim(); if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" }); const a = actor(req); const old = order.status; order.status = "REJECTED"; order.rejectionReason = reason; order.rejectedBy = a.id; order.rejectedDate = new Date(); await order.save(); await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "REJECTED", oldStatus: old, newStatus: "REJECTED", actorId: a.id, actorName: a.name, remarks: reason }); res.json({ success: true, data: order }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function start(req, res) {
  try { const order = await WorkOrder.findById(req.params.id); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); assertTransition("WORK_ORDER", order.status, "WORK_STARTED"); const a = actor(req); const old = order.status;
    /** Optional work-start evidence: base64 data-URL images from the client, capped at 10 per upload. */
    const evidence = Array.isArray(req.body?.workStartEvidence) ? req.body.workStartEvidence : [];
    if (evidence.length > 10) return res.status(400).json({ success: false, message: "A maximum of 10 work-start evidence images is allowed" });
    for (const img of evidence) { if (!img?.data || !String(img.data).startsWith("data:image/")) return res.status(400).json({ success: false, message: "Each work-start evidence item must be a base64 image data URL" }); }
    if (evidence.length) order.workStartEvidence = evidence.map((img) => ({ fileName: String(img.fileName || "work-start-image"), data: String(img.data), uploadedAt: new Date() }));
    order.status = "WORK_STARTED"; order.startedAt = new Date(); order.startedBy = a.id; await order.save();
    await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "STARTED", oldStatus: old, newStatus: "WORK_STARTED", actorId: a.id, actorName: a.name }); res.json({ success: true, data: order }); } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function complete(req, res) {
  try {
    const order = await WorkOrder.findById(req.params.id); if (!order) return res.status(404).json({ success: false, message: "Work order not found" }); assertTransition("WORK_ORDER", order.status, "WORK_COMPLETED"); if (!String(req.body?.completionNotes || "").trim()) return res.status(400).json({ success: false, message: "Completion notes are required" }); const a = actor(req);
    /** Optional work-completion evidence: base64 data-URL images from the client, capped at 10 per upload. */
    const evidence = Array.isArray(req.body?.workCompletionEvidence) ? req.body.workCompletionEvidence : [];
    if (evidence.length > 10) return res.status(400).json({ success: false, message: "A maximum of 10 work-completion evidence images is allowed" });
    for (const img of evidence) { if (!img?.data || !String(img.data).startsWith("data:image/") ) return res.status(400).json({ success: false, message: "Each work-completion evidence item must be a base64 image data URL" }); }
    if (evidence.length) order.workCompletionEvidence = evidence.map((img) => ({ fileName: String(img.fileName || "work-completion-image"), data: String(img.data), uploadedAt: new Date() }));
    const result = await withTransaction(async (session) => {
      let invoice = order.invoiceId ? await (session ? Invoice.findById(order.invoiceId).session(session) : Invoice.findById(order.invoiceId)) : null;
      if (!invoice) invoice = await (session ? Invoice.findOne({ workOrderId: order._id }).session(session) : Invoice.findOne({ workOrderId: order._id }));
      if (!invoice) { const q = await Quotation.findById(order.quotationId).lean(); const data = { workOrderId: order._id, quotationId: order.quotationId, inquiryId: order.inquiryId, leadId: order.leadId, customerId: order.customerId, ledgerAccountId: null, items: q?.items || [], taxRate: q?.taxRate || 5, paymentTerms: q?.terms || "", status: "DRAFT", createdBy: a.id, createdByName: a.name }; invoice = session ? (await Invoice.create([data], { session }))[0] : await Invoice.create(data); }
      const old = order.status; order.status = "WORK_COMPLETED"; order.completedAt = new Date(); order.completedBy = a.id; order.completionNotes = req.body.completionNotes; order.materialsUsed = req.body.materialsUsed || ""; order.customerConfirmation = req.body.customerConfirmation || ""; order.invoiceId = invoice._id; await order.save(session ? { session } : undefined); await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "COMPLETED", oldStatus: old, newStatus: "WORK_COMPLETED", actorId: a.id, actorName: a.name, session }); return { order, invoice };
    });
    res.json({ success: true, data: result.order, invoice: result.invoice });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}
