import Quotation from "../models/quotation.model.js";
import Inquiry from "../models/inquiry.model.js";
import SiteInspection from "../models/site-inspection.model.js";
import Lead from "../models/lead.model.js";
import Customer from "../models/customer.model.js";
import WorkOrder from "../models/work-order.model.js";
import Company from "../models/company.model.js";
import { generatePdf } from "../utils/pdf.js";
import { sendMail } from "../utils/mailer.js";
import { withTransaction } from "../utils/tx.js";
import { actor, recordHistory } from "../services/document-workflow.service.js";

export async function list(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "", customerId = "" } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (search) filter.$or = [{ quotationNo: { $regex: search, $options: "i" } }, { remarks: { $regex: search, $options: "i" } }];
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Quotation.find(filter)
        .populate("customerId", "companyName contactPerson mobile email")
        .populate("inquiryId", "inquiryNo customerName companyName mobile serviceLocation location serviceType pestTypes")
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Quotation.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) || 1 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function getById(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id).lean();
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
    const { WorkflowHistory } = await import("../models/workflow.model.js");
    const history = await WorkflowHistory.find({ entityType: "QUOTATION", entityId: quotation._id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: { ...quotation, workflowHistory: history } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

export async function create(req, res) {
  try {
    const inquiry = await Inquiry.findById(req.body.inquiryId).lean();
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });
    const existing = await Quotation.findOne({ inquiryId: inquiry._id, ...(req.body.inspectionId ? { inspectionId: req.body.inspectionId } : { inspectionId: null }) });
    if (existing) return res.json({ success: true, data: existing, alreadyExists: true });
    // Server-side workflow gate: an inquiry flagged for inspection can only get a
    // NEW quotation after its Site Inspection exists and is APPROVED. Prevents API
    // bypass of the Inquiry → Site Inspection → Quotation flow.
    if (inquiry.siteInspectionRequired === true) {
      const inspection = await SiteInspection.findOne({ inquiryId: inquiry._id }).lean();
      if (!inspection) return res.status(400).json({ success: false, message: "Site Inspection is required before proceeding to Quotation." });
      if (inspection.status !== "APPROVED") return res.status(400).json({ success: false, message: "Site Inspection must be approved before creating the quotation." });
    }
    const a = actor(req);
    const quotation = await Quotation.create({ ...req.body, inquiryId: inquiry._id, leadId: req.body.leadId || inquiry.leadId, customerId: req.body.customerId || inquiry.erpCustomerId || inquiry.customerId, createdBy: a.id, createdByName: a.name, status: "DRAFT" });
    await recordHistory({ documentType: "QUOTATION", documentId: quotation._id, action: "CREATED", newStatus: quotation.status, actorId: a.id, actorName: a.name });
    res.status(201).json({ success: true, data: quotation });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function update(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
    if (!["DRAFT", "REJECTED", "PENDING_APPROVAL", "SENT"].includes(quotation.status)) return res.status(400).json({ success: false, message: "Quotation cannot be edited in its current status" });
    const allowed = ["validUntil", "salesPerson", "paymentTerms", "terms", "notes", "remarks", "items", "taxRate", "discount", "paymentTypeId", "paymentStartDate", "gracePeriodDays", "customIntervalMonths"];
    for (const key of allowed) if (key in req.body) quotation[key] = req.body[key];
    const a = actor(req); quotation.updatedBy = a.id; quotation.updatedByName = a.name;
    await quotation.save();
    res.json({ success: true, data: quotation });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function submit(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
    if (!["DRAFT", "REJECTED"].includes(quotation.status)) return res.status(400).json({ success: false, message: "Only draft or rejected quotations can be submitted" });
    const a = actor(req); const old = quotation.status;
    quotation.status = "PENDING_APPROVAL"; quotation.updatedBy = a.id; quotation.updatedByName = a.name; await quotation.save();
    await recordHistory({ documentType: "QUOTATION", documentId: quotation._id, action: "SUBMITTED", oldStatus: old, newStatus: "PENDING_APPROVAL", actorId: a.id, actorName: a.name });
    res.json({ success: true, data: quotation });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function approve(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
    if (quotation.workOrderId) return res.json({ success: true, data: quotation, alreadyApproved: true });
    if (!["DRAFT", "SENT", "PENDING_APPROVAL"].includes(quotation.status)) return res.status(400).json({ success: false, message: `Quotation cannot be approved from ${quotation.status}` });
    if (!quotation.customerId || !quotation.inquiryId) return res.status(400).json({ success: false, message: "Quotation must have a customer and inquiry" });
    const a = actor(req);
    const result = await withTransaction(async (session) => {
      let order = session ? await WorkOrder.findOne({ quotationId: quotation._id }).session(session) : await WorkOrder.findOne({ quotationId: quotation._id });
      if (!order) {
        const data = { quotationId: quotation._id, inquiryId: quotation.inquiryId, leadId: quotation.leadId, inspectionId: quotation.inspectionId, customerId: quotation.customerId, serviceType: "Pest Control", workDescription: quotation.remarks || quotation.notes || "", status: "DRAFT", createdBy: a.id, createdByName: a.name };
        order = session ? (await WorkOrder.create([data], { session }))[0] : await WorkOrder.create(data);
        await recordHistory({ documentType: "WORK_ORDER", documentId: order._id, action: "CREATED", newStatus: order.status, actorId: a.id, actorName: a.name, session });
      }
      const old = quotation.status;
      quotation.status = "APPROVED"; quotation.updatedBy = a.id; quotation.updatedByName = a.name; quotation.approvedBy = a.id; quotation.approvedDate = new Date(); quotation.workOrderId = order._id;
      await quotation.save(session ? { session } : undefined);
      await recordHistory({ documentType: "QUOTATION", documentId: quotation._id, action: "APPROVED", oldStatus: old, newStatus: "APPROVED", actorId: a.id, actorName: a.name, session });
      return { quotation, order };
    });
    res.json({ success: true, data: result.quotation, workOrder: result.order });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

export async function reject(req, res) {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" });
    if (!["DRAFT", "SENT", "PENDING_APPROVAL"].includes(quotation.status)) return res.status(400).json({ success: false, message: "Quotation cannot be rejected in its current status" });
    const a = actor(req); const old = quotation.status;
    quotation.status = "REJECTED"; quotation.rejectionReason = reason; quotation.rejectedBy = a.id; quotation.rejectedDate = new Date(); quotation.updatedBy = a.id; await quotation.save();
    await recordHistory({ documentType: "QUOTATION", documentId: quotation._id, action: "REJECTED", oldStatus: old, newStatus: "REJECTED", actorId: a.id, actorName: a.name, remarks: reason });
    res.json({ success: true, data: quotation });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function buildQuotationPdfData(quotationId) {
  const quotation = await Quotation.findById(quotationId).lean();
  if (!quotation) throw new Error("Quotation not found");
  const inquiry = await Inquiry.findById(quotation.inquiryId).lean();
  const lead = quotation.leadId ? await Lead.findById(quotation.leadId).lean() : null;
  const customer = quotation.customerId ? await Customer.findById(quotation.customerId).lean() : null;
  const company = (await Company.findOne({ isActive: true }).lean()) || {};
  return { company, quotation, customer, leadNo: lead?.leadNo || "", inquiryNo: inquiry?.inquiryNo || "", serviceLocation: inquiry?.serviceLocation || "", items: quotation.items || [] };
}

export async function pdf(req, res) {
  try { const data = await buildQuotationPdfData(req.params.id); const pdfBuffer = await generatePdf("quotation", data); res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `inline; filename="${data.quotation.quotationNo}.pdf"`); res.send(Buffer.from(pdfBuffer)); } catch (err) { res.status(500).json({ success: false, message: `PDF generation failed: ${err.message}` }); }
}

export async function send(req, res) {
  try {
    const data = await buildQuotationPdfData(req.params.id);
    if (!data.customer?.email) return res.status(400).json({ success: false, message: "Customer has no email address on file" });
    const pdfBuffer = await generatePdf("quotation", data);
    const result = await sendMail({ to: data.customer.email, subject: `Quotation ${data.quotation.quotationNo}`, html: `<p>Please find attached quotation ${data.quotation.quotationNo}.</p>`, attachments: [{ filename: `${data.quotation.quotationNo}.pdf`, content: Buffer.from(pdfBuffer) }] });
    if (!result.sent) return res.status(500).json({ success: false, message: result.error || "Unable to send quotation" });
    const quotation = await Quotation.findById(req.params.id); if (quotation?.status === "DRAFT") { quotation.status = "SENT"; await quotation.save(); }
    res.json({ success: true, message: "Quotation sent successfully" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}
