import Inquiry from "../models/inquiry.model.js";
import Lead from "../models/lead.model.js";
import Customer from "../models/customer.model.js";
import InquiryService from "../services/inquiry.service.js";
import SiteInspection from "../models/site-inspection.model.js";
import Quotation from "../models/quotation.model.js";
import ServiceJob from "../models/servicejob.model.js";
import Invoice from "../models/invoice.model.js";
import { withTransaction } from "../utils/tx.js";
import { actor, recordHistory } from "../services/document-workflow.service.js";

/**
 * Fields an inquiry must carry to be saved or approved. Reported together so the
 * user sees every gap at once (the form applies the same rule client-side).
 */
function mandatoryMissing(inquiry) {
  const has = (value) =>
    typeof value === "string" ? value.trim().length > 0 : !!value;
  const missing = [];
  if (!has(inquiry.contactPerson)) missing.push("Contact person");
  if (!has(inquiry.mobile)) missing.push("Mobile");
  if (!has(inquiry.email)) missing.push("Email");
  if (!has(inquiry.propertyType)) missing.push("Type of property");
  if (!has(inquiry.entryPoints)) missing.push("Possible entry point");
  if (!has(inquiry.serviceType)) missing.push("Service type");
  if (!has(inquiry.serviceLocation) && !has(inquiry.location))
    missing.push("Location");
  if (!has(inquiry.preferredDate)) missing.push("Preferred date");
  if (!has(inquiry.preferredTime)) missing.push("Preferred time");
  if (!has(inquiry.urgency)) missing.push("Urgency");
  return missing;
}

const inquiryController = {
  async create(req, res) {
    try {
      const inquiry = await InquiryService.createInquiry(
        req.body,
        req.admin || req.user,
      );
      return res.status(201).json({
        success: true,
        message: "Inquiry created successfully",
        data: inquiry,
      });
    } catch (error) {
      console.error("Create inquiry error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create inquiry",
      });
    }
  },

  async list(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        stage = "",
        status = "",
        urgency = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const result = await InquiryService.listInquiries({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        stage,
        status,
        urgency,
        sortBy,
        sortOrder,
        customerId: req.query.customerId || null,
      });
      return res.status(200).json({
        success: true,
        data: result.inquiries,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("List inquiries error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list inquiries",
      });
    }
  },

  async getById(req, res) {
    try {
      const inquiry = await Inquiry.findById(req.params.id);
      if (!inquiry)
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      const linkedDocuments = {};
      const inquiryData = inquiry.toObject();
      // Older lead-converted inquiries may have only one of the location fields
      // populated. Keep the detail page consistent with the source lead.
      if (
        inquiry.leadId &&
        (!inquiryData.serviceLocation ||
          !inquiryData.location ||
          !inquiryData.customerName)
      ) {
        const lead = await Lead.findById(inquiry.leadId)
          .select("location address customerName companyName contactPerson")
          .lean();
        const leadLocation = lead?.location || lead?.address || "";
        if (!inquiryData.serviceLocation)
          inquiryData.serviceLocation = leadLocation;
        if (!inquiryData.location) inquiryData.location = leadLocation;
        if (!inquiryData.customerName)
          inquiryData.customerName =
            lead?.customerName ||
            lead?.companyName ||
            lead?.contactPerson ||
            "";
        if (!inquiryData.companyName)
          inquiryData.companyName = lead?.companyName || "";
        if (!inquiryData.contactPerson)
          inquiryData.contactPerson = lead?.contactPerson || "";
      }
      if (
        !inquiryData.customerName &&
        (inquiryData.customerId || inquiryData.erpCustomerId)
      ) {
        const customer = await Customer.findById(
          inquiryData.customerId || inquiryData.erpCustomerId,
        )
          .select("companyName contactPerson")
          .lean();
        inquiryData.customerName =
          customer?.companyName || customer?.contactPerson || "";
      }
      if (inquiry.inspectionId)
        linkedDocuments.inspection = await SiteInspection.findById(
          inquiry.inspectionId,
        );
      if (inquiry.quotationId)
        linkedDocuments.quotation = await Quotation.findById(
          inquiry.quotationId,
        );
      if (inquiry.serviceJobId)
        linkedDocuments.serviceJob = await ServiceJob.findById(
          inquiry.serviceJobId,
        );
      if (inquiry.invoiceId)
        linkedDocuments.invoice = await Invoice.findById(inquiry.invoiceId);
      return res
        .status(200)
        .json({ success: true, data: { ...inquiryData, linkedDocuments } });
    } catch (error) {
      console.error("Get inquiry error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get inquiry",
      });
    }
  },

  async saveDraft(req, res) {
    try {
      const inquiry = await Inquiry.findById(req.params.id);
      if (!inquiry)
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });

      // A saved draft must be complete: validate the record as it will exist
      // after this write, so a part-filled payload cannot hide a missing field.
      const missing = mandatoryMissing({
        ...inquiry.toObject(),
        ...(req.body || {}),
      });
      if (missing.length)
        return res.status(400).json({
          success: false,
          message: `Cannot save: missing mandatory fields — ${missing.join(
            ", ",
          )}`,
        });

      const saved = await InquiryService.saveDraft(
        req.params.id,
        req.body,
        req.admin || req.user,
      );
      return res.status(200).json({
        success: true,
        message: "Inquiry saved as draft",
        data: saved,
      });
    } catch (error) {
      console.error("Save inquiry draft error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to save inquiry draft",
      });
    }
  },

  async approve(req, res) {
    try {
      const inquiry = await Inquiry.findById(req.params.id);
      if (!inquiry)
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      if (
        !["CREATED", "SUBMITTED", "DRAFT", "PENDING_APPROVAL"].includes(
          inquiry.status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Only draft inquiries can be approved (current: ${inquiry.status})`,
        });
      }

      const missing = mandatoryMissing(inquiry);
      if (missing.length)
        return res.status(400).json({
          success: false,
          message: `Cannot approve: missing mandatory fields — ${missing.join(
            ", ",
          )}`,
        });

      const customerId = inquiry.erpCustomerId || inquiry.customerId;
      if (!customerId)
        return res.status(400).json({
          success: false,
          message: "Inquiry must have a customer before approval",
        });
      const a = actor(req);
      const result = await withTransaction(async (session) => {
        const current = session
          ? await Inquiry.findById(inquiry._id).session(session)
          : await Inquiry.findById(inquiry._id);
        if (!current) throw new Error("Inquiry not found");
        if (
          !["CREATED", "SUBMITTED", "DRAFT", "PENDING_APPROVAL"].includes(
            current.status,
          )
        ) {
          throw new Error(
            `Only draft inquiries can be approved (current: ${current.status})`,
          );
        }

        // Authoritative gate: the record cannot change between the checks above
        // and this write, so this is where completeness is guaranteed.
        const stillMissing = mandatoryMissing(current);
        if (stillMissing.length) {
          throw new Error(
            `Cannot approve: missing mandatory fields — ${stillMissing.join(", ")}`,
          );
        }

        if (typeof req.body?.siteInspectionRequired === "boolean") {
          current.siteInspectionRequired = req.body.siteInspectionRequired;
        }

        let downstream;
        let nextType;
        if (current.siteInspectionRequired === true) {
          nextType = "INSPECTION";
          downstream = session
            ? await SiteInspection.findOne({ inquiryId: current._id }).session(
                session,
              )
            : await SiteInspection.findOne({ inquiryId: current._id });
          if (!downstream) {
            const data = {
              inquiryId: current._id,
              leadId: current.leadId,
              customerId,
              location: current.serviceLocation || current.location || "",
              pestType: Array.isArray(current.pestTypes)
                ? current.pestTypes.join(", ")
                : "",
              remarks: current.remarks || "",
              status: "DRAFT",
              createdBy: a.id,
              createdByName: a.name,
            };
            // findOneAndUpdate + upsert is race-safe: with the unique index on
            // inquiryId, exactly one insert succeeds under concurrent requests and
            // the loser falls back to reading the winning document.
            downstream = session
              ? await SiteInspection.findOneAndUpdate(
                  { inquiryId: current._id },
                  { $setOnInsert: data },
                  { new: true, upsert: true, session },
                ).catch(async (e) => {
                  if (e?.code === 11000) return SiteInspection.findOne({ inquiryId: current._id }).session(session).lean();
                  throw e;
                })
              : await SiteInspection.findOneAndUpdate(
                  { inquiryId: current._id },
                  { $setOnInsert: data },
                  { new: true, upsert: true },
                ).catch(async (e) => {
                  if (e?.code === 11000) return SiteInspection.findOne({ inquiryId: current._id }).lean();
                  throw e;
                });
            if (downstream) {
              await recordHistory({
                documentType: "INSPECTION",
                documentId: downstream._id,
                action: "CREATED",
                newStatus: downstream.status || "DRAFT",
                actorId: a.id,
                actorName: a.name,
                session,
              });
            }
          }
          current.inspectionId = downstream._id;
          current.quotationId = null;
        } else {
          nextType = "QUOTATION";
          downstream = session
            ? await Quotation.findOne({
                inquiryId: current._id,
                inspectionId: null,
              }).session(session)
            : await Quotation.findOne({
                inquiryId: current._id,
                inspectionId: null,
              });
          if (!downstream) {
            const data = {
              inquiryId: current._id,
              leadId: current.leadId,
              customerId,
              inspectionId: null,
              status: "DRAFT",
              remarks: current.remarks || "",
              createdBy: a.id,
              createdByName: a.name,
            };
            downstream = session
              ? (await Quotation.create([data], { session }))[0]
              : await Quotation.create(data);
            await recordHistory({
              documentType: "QUOTATION",
              documentId: downstream._id,
              action: "CREATED",
              newStatus: "DRAFT",
              actorId: a.id,
              actorName: a.name,
              session,
            });
          }
          current.quotationId = downstream._id;
          current.inspectionId = null;
        }

        const oldStatus = current.status;
        current.status = "APPROVED";
        current.approvedBy = a.id;
        current.approvedDate = new Date();
        current.updatedBy = a.id;
        current.updatedByName = a.name;
        await current.save(session ? { session } : undefined);
        await recordHistory({
          documentType: "INQUIRY",
          documentId: current._id,
          action: "APPROVED",
          oldStatus,
          newStatus: "APPROVED",
          actorId: a.id,
          actorName: a.name,
          session,
        });
        return { inquiry: current, downstream, nextType };
      });

      return res.status(200).json({
        success: true,
        message: result.nextType === "INSPECTION"
          ? "Inquiry approved and Site Inspection created successfully."
          : "Inquiry approved successfully. Site Inspection is not required.",
        data: result.inquiry,
        nextType: result.nextType,
        nextId: result.downstream._id,
      });
    } catch (error) {
      // Duplicate-key race: two concurrent approve calls can both pass the findOne
      // guard; the unique index lets exactly one create the inspection. Return the
      // existing document instead of failing.
      if (error?.code === 11000) {
        const existing = await SiteInspection.findOne({ inquiryId: inquiry._id }).lean();
        if (existing) {
          return res.status(200).json({
            success: true,
            message: "Site Inspection already exists for this Inquiry.",
            data: await Inquiry.findById(inquiry._id),
            nextType: "INSPECTION",
            nextId: existing._id,
          });
        }
      }
      console.error("Approve inquiry error:", error);
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || "Failed to approve inquiry",
      });
    }
  },

  async reject(req, res) {
    try {
      const inquiry = await Inquiry.findById(req.params.id);
      if (!inquiry)
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      if (
        !["CREATED", "SUBMITTED", "DRAFT", "PENDING_APPROVAL"].includes(
          inquiry.status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Only draft inquiries can be rejected (current: ${inquiry.status})`,
        });
      }
      const reason = String(req.body?.reason || "").trim();
      if (!reason)
        return res
          .status(400)
          .json({ success: false, message: "Rejection reason is required" });
      const a = actor(req);
      const oldStatus = inquiry.status;
      inquiry.status = "REJECTED";
      inquiry.rejectionReason = reason;
      inquiry.rejectedBy = a.id;
      inquiry.rejectedDate = new Date();
      inquiry.updatedBy = a.id;
      inquiry.updatedByName = a.name;
      await inquiry.save();
      await recordHistory({
        documentType: "INQUIRY",
        documentId: inquiry._id,
        action: "REJECTED",
        oldStatus,
        newStatus: "REJECTED",
        actorId: a.id,
        actorName: a.name,
        remarks: reason,
      });
      return res
        .status(200)
        .json({ success: true, message: "Inquiry rejected", data: inquiry });
    } catch (error) {
      console.error("Reject inquiry error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to reject inquiry",
      });
    }
  },

  async update(req, res) {
    try {
      const inquiry = await InquiryService.updateInquiry(
        req.params.id,
        req.body,
        req.admin || req.user,
      );
      return res.status(200).json({
        success: true,
        message: "Inquiry updated successfully",
        data: inquiry,
      });
    } catch (error) {
      console.error("Update inquiry error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update inquiry",
      });
    }
  },

  async delete(req, res) {
    try {
      const inquiry = await Inquiry.findById(req.params.id);
      if (!inquiry)
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      if (
        !["DRAFT", "CREATED"].includes(inquiry.status) &&
        !["DRAFT", "CREATED"].includes(inquiry.currentStageCode)
      )
        return res.status(400).json({
          success: false,
          message: "Cannot delete inquiry that has been submitted",
        });
      await inquiry.deleteOne();
      return res
        .status(200)
        .json({ success: true, message: "Inquiry deleted successfully" });
    } catch (error) {
      console.error("Delete inquiry error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete inquiry",
      });
    }
  },

  async getStats(req, res) {
    try {
      const total = await Inquiry.countDocuments();
      const active = await Inquiry.countDocuments({
        $or: [{ status: "active" }, { status: "APPROVED" }],
      });
      const completed = await Inquiry.countDocuments({
        $or: [{ status: "completed" }, { status: "COMPLETED" }],
      });
      const cancelled = await Inquiry.countDocuments({
        $or: [{ status: "cancelled" }, { status: "CANCELLED" }],
      });
      const rejected = await Inquiry.countDocuments({
        $or: [{ status: "rejected" }, { status: "REJECTED" }],
      });
      const urgent = await Inquiry.countDocuments({
        urgency: "URGENT",
        status: { $in: ["active", "APPROVED"] },
      });
      const emergency = await Inquiry.countDocuments({
        urgency: "EMERGENCY",
        status: { $in: ["active", "APPROVED"] },
      });
      const byStage = await Inquiry.aggregate([
        { $group: { _id: "$currentStageCode", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      return res.status(200).json({
        success: true,
        data: {
          total,
          active,
          completed,
          cancelled,
          rejected,
          urgent,
          emergency,
          byStage,
        },
      });
    } catch (error) {
      console.error("Get stats error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to get statistics" });
    }
  },
};

export default inquiryController;
