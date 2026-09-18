import SiteInspection from "../models/site-inspection.model.js";
import Inquiry from "../models/inquiry.model.js";
import Quotation from "../models/quotation.model.js";
import { withTransaction } from "../utils/tx.js";
import { actor, assertTransition, recordHistory } from "../services/document-workflow.service.js";

const editable = ["inspectionDate", "location", "inspector", "inspectionType", "findings", "pestType", "affectedArea", "severity", "recommendations", "requiredTreatment", "estimatedWork", "attachments", "remarks"];

export async function create(req, res) {
  try {
    const a = actor(req);
    const inquiry = await Inquiry.findById(req.body.inquiryId).lean();
    if (!inquiry || !inquiry.siteInspectionRequired) return res.status(400).json({ success: false, message: "Inspection is not required for this inquiry" });
    // Duplicate prevention: strictly one Site Inspection per Inquiry
    const existing = await SiteInspection.findOne({ inquiryId: inquiry._id }).lean();
    if (existing) return res.status(409).json({ success: false, message: "Site Inspection already exists for this Inquiry.", data: existing });
    const inspection = await SiteInspection.create({ ...req.body, inquiryId: inquiry._id, leadId: req.body.leadId || inquiry.leadId, customerId: req.body.customerId || inquiry.erpCustomerId || inquiry.customerId, createdBy: a.id, createdByName: a.name });
    await recordHistory({ documentType: "INSPECTION", documentId: inspection._id, action: "CREATED", newStatus: inspection.status, actorId: a.id, actorName: a.name });
    res.status(201).json({ success: true, data: inspection });
  } catch (err) {
    // Race fallback: unique index rejected a concurrent duplicate insert
    if (err?.code === 11000) return res.status(409).json({ success: false, message: "Site Inspection already exists for this Inquiry." });
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function list(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "", customerId = "" } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (search) filter.$or = [{ inspectionNo: { $regex: search, $options: "i" } }, { location: { $regex: search, $options: "i" } }, { inspector: { $regex: search, $options: "i" } }];
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([SiteInspection.find(filter)
        .populate("inquiryId", "inquiryNo customerName companyName mobile serviceLocation location")
        .populate("customerId", "companyName contactPerson mobile")
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(), SiteInspection.countDocuments(filter)]);
    // Flatten inquiry/customer info so list rows carry the ERP context
    const enriched = data.map((row) => ({
      ...row,
      inquiryNo: row.inquiryId?.inquiryNo || "",
      customerName: row.customerId?.companyName || row.customerId?.contactPerson || row.inquiryId?.customerName || row.inquiryId?.companyName || "",
      siteLocation: row.location || row.inquiryId?.serviceLocation || row.inquiryId?.location || "",
    }));
    res.json({ success: true, data: enriched, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) || 1 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function getById(req, res) {
  try {
    const inspection = await SiteInspection.findById(req.params.id)
      .populate("inquiryId", "inquiryNo customerName companyName contactPerson mobile serviceLocation location pestTypes")
      .populate("customerId", "companyName contactPerson mobile email")
      .lean();
    if (!inspection) return res.status(404).json({ success: false, message: "Site inspection not found" });
    const history = await (await import("../models/workflow.model.js")).WorkflowHistory.find({ entityType: "INSPECTION", entityId: inspection._id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: { ...inspection, workflowHistory: history } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function update(req, res) {
  try {
    const inspection = await SiteInspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: "Site inspection not found" });
    if (!["DRAFT", "REJECTED", "PENDING_APPROVAL"].includes(inspection.status)) return res.status(400).json({ success: false, message: "Inspection cannot be edited in its current status" });
    for (const key of editable) if (key in req.body) inspection[key] = req.body[key];
    if (req.body.status && req.body.status !== inspection.status) assertTransition("INSPECTION", inspection.status, req.body.status);
    const a = actor(req); inspection.updatedBy = a.id; inspection.updatedByName = a.name;
    await inspection.save();
    res.json({ success: true, data: inspection });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function submit(req, res) {
  try {
    const inspection = await SiteInspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: "Site inspection not found" });
    if (inspection.status !== "DRAFT" && inspection.status !== "REJECTED") return res.status(400).json({ success: false, message: "Only draft or rejected inspections can be submitted" });
    const a = actor(req); const old = inspection.status;
    inspection.status = "PENDING_APPROVAL"; inspection.updatedBy = a.id; inspection.updatedByName = a.name;
    await inspection.save();
    await recordHistory({ documentType: "INSPECTION", documentId: inspection._id, action: "SUBMITTED", oldStatus: old, newStatus: "PENDING_APPROVAL", actorId: a.id, actorName: a.name });
    res.json({ success: true, data: inspection });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function approve(req, res) {
  try {
    const inspection = await SiteInspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: "Site inspection not found" });
    if (inspection.status === "APPROVED" && inspection.quotationId) return res.json({ success: true, data: inspection, quotationId: inspection.quotationId, alreadyApproved: true });
    assertTransition("INSPECTION", inspection.status, "APPROVED");
    const a = actor(req);
    const result = await withTransaction(async (session) => {
      let quotation = inspection.quotationId ? await (session ? Quotation.findById(inspection.quotationId).session(session) : Quotation.findById(inspection.quotationId)) : null;
      if (!quotation) quotation = await (session ? Quotation.findOne({ inspectionId: inspection._id }).session(session) : Quotation.findOne({ inspectionId: inspection._id }));
      if (!quotation) {
        const data = { inquiryId: inspection.inquiryId, leadId: inspection.leadId, customerId: inspection.customerId, inspectionId: inspection._id, status: "DRAFT", remarks: inspection.remarks || "" };
        quotation = session ? (await Quotation.create([data], { session }))[0] : await Quotation.create(data);
      }
      inspection.status = "APPROVED"; inspection.approvedBy = a.id; inspection.approvedDate = new Date(); inspection.quotationId = quotation._id; inspection.updatedBy = a.id; inspection.updatedByName = a.name;
      await inspection.save(session ? { session } : undefined);
      await Inquiry.updateOne({ _id: inspection.inquiryId }, { $set: { inspectionId: inspection._id, quotationId: quotation._id, status: "APPROVED" } }, session ? { session } : {});
      await recordHistory({ documentType: "INSPECTION", documentId: inspection._id, action: "APPROVED", oldStatus: "PENDING_APPROVAL", newStatus: "APPROVED", actorId: a.id, actorName: a.name, session });
      return { inspection, quotation };
    });
    res.json({ success: true, data: result.inspection, quotation: result.quotation });
  } catch (err) { res.status(err.statusCode || 400).json({ success: false, message: err.message }); }
}

export async function reject(req, res) {
  try {
    const inspection = await SiteInspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: "Site inspection not found" });
    assertTransition("INSPECTION", inspection.status, "REJECTED");
    const a = actor(req); const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" });
    const old = inspection.status; inspection.status = "REJECTED"; inspection.rejectionReason = reason; inspection.rejectedBy = a.id; inspection.rejectedDate = new Date(); inspection.updatedBy = a.id; inspection.updatedByName = a.name; await inspection.save();
    await recordHistory({ documentType: "INSPECTION", documentId: inspection._id, action: "REJECTED", oldStatus: old, newStatus: "REJECTED", actorId: a.id, actorName: a.name, remarks: reason });
    res.json({ success: true, data: inspection });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}
