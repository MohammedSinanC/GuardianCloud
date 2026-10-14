import Inquiry from "../models/inquiry.model.js";
import Lead from "../models/lead.model.js";
import Customer from "../models/customer.model.js";

/**
 * Backfill customerName on list rows from the linked customer or lead.
 * Portal-created inquiries keep the raw `customerId`/`leadId` but may not
 * store a snapshot of the name, so resolve it per unique reference.
 */
async function backfillCustomerNames(rows) {
  const rowsByName = rows.filter((row) => !row.customerName);
  if (rowsByName.length === 0) return rows;

  const customerIds = [...new Set(rowsByName.map((r) => r.customerId || r.erpCustomerId).filter(Boolean).map(String))];
  const leadIds = [...new Set(rowsByName.map((r) => r.leadId).filter(Boolean).map(String))];

  const [customers, leads] = await Promise.all([
    customerIds.length ? Customer.find({ _id: { $in: customerIds } }).select("companyName contactPerson").lean() : [],
    leadIds.length ? Lead.find({ _id: { $in: leadIds } }).select("customerName companyName contactPerson").lean() : [],
  ]);

  const customerMap = new Map(customers.map((c) => [String(c._id), c.companyName || c.contactPerson || ""]));
  const leadMap = new Map(leads.map((l) => [String(l._id), l.customerName || l.companyName || l.contactPerson || ""]));

  for (const row of rowsByName) {
    const customerId = String(row.customerId || row.erpCustomerId || "");
    const leadId = String(row.leadId || "");
    const resolved = customerMap.get(customerId) || leadMap.get(leadId) || "";
    if (resolved) {
      row.customerName = resolved;
    }
  }

  return rows;
}

/**
 * Attach the source lead number to list rows so the table can show "Lead No"
 * with one batched lookup instead of a per-row query.
 */
async function attachLeadNumbers(rows) {
  const leadIds = [...new Set(rows.map((r) => r.leadId).filter(Boolean).map(String))];
  if (leadIds.length === 0) {
    for (const row of rows) row.leadNo = "";
    return rows;
  }

  const leads = await Lead.find({ _id: { $in: leadIds } }).select("leadNo").lean();
  const leadMap = new Map(leads.map((l) => [String(l._id), l.leadNo || ""]));

  for (const row of rows) {
    row.leadNo = row.leadId ? leadMap.get(String(row.leadId)) || "" : "";
  }

  return rows;
}

class InquiryService {
  /**
   * Create a new inquiry (customer action)
   */
  async createInquiry(data, user) {
    const workflowCode = data.workflowCode || "PEST_CONTROL";

    const inquiry = new Inquiry({
      ...data,
      // CREATED is the initial stage of the PEST_CONTROL workflow
      status: data.status || "CREATED",
      currentStageCode: data.currentStageCode || "CREATED",
      workflowCode,
      inquiryDate: data.inquiryDate || new Date(),
      createdBy: user?.id || null,
      createdByName: user?.username || data.customerName || "customer",
    });

    await inquiry.save();

    return inquiry;
  }

  /**
   * Update an inquiry (only if stage allows editing)
   */
  async updateInquiry(inquiryId, data, user) {
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw new Error("Inquiry not found");
    }

    const editableStages = ["CREATED", "SUBMITTED", "DRAFT", "PENDING_APPROVAL", "REJECTED"];
    if (!editableStages.includes(inquiry.status) && !editableStages.includes(inquiry.currentStageCode)) {
      throw new Error("Cannot edit inquiry in the current status");
    }

    const allowed = ["source", "customerName", "companyName", "contactPerson", "mobile", "email", "serviceType", "serviceLocation", "location", "building", "unit", "area", "pestTypes", "propertyType", "populationLevel", "entryPoints", "problemDescription", "preferredDate", "preferredTime", "urgency", "siteInspectionRequired", "assignedTo", "assignedToName", "attachments", "remarks"];
    for (const key of allowed) {
      if (key in data) inquiry[key] = data[key];
    }
    inquiry.updatedBy = user?.id || null;
    inquiry.updatedByName = user?.username || "system";
    await inquiry.save();

    return inquiry;
  }

  async saveDraft(inquiryId, data, user) {
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) throw new Error("Inquiry not found");
    if (!["CREATED", "SUBMITTED", "DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(inquiry.status)) {
      throw new Error("Only draft, pending, or rejected inquiries can be saved as draft");
    }
    const wasCreated = inquiry.status === "CREATED" || inquiry.currentStageCode === "CREATED";
    const updated = await this.updateInquiry(inquiryId, data, user);
    if (wasCreated) {
      // Keep the configured workflow stage for lead-converted inquiries
      updated.status = "CREATED";
      updated.currentStageCode = "CREATED";
    } else {
      updated.status = "DRAFT";
      updated.currentStageCode = "DRAFT";
    }
    updated.rejectionReason = "";
    updated.rejectedBy = null;
    updated.rejectedDate = null;
    await updated.save();
    return updated;
  }


  async getInquiryById(inquiryId) {
    return Inquiry.findById(inquiryId);
  }

  /**
   * List inquiries with filtering, search, pagination
   */
  async listInquiries({
    page = 1,
    limit = 20,
    search = "",
    stage = "",
    status = "",
    urgency = "",
    sortBy = "createdAt",
    sortOrder = "desc",
    customerId = null,
  }) {
    const query = {};

    // Search
    if (search) {
      query.$or = [
        { inquiryNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { serviceLocation: { $regex: search, $options: "i" } },
      ];
    }

    // Filters
    if (stage) {
      const stages = String(stage).split(',').map((value) => value.trim()).filter(Boolean);
      query.currentStageCode = stages.length > 1 ? { $in: stages } : stages[0];
    }
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (customerId) {
      query.$or = [{ customerId }, { erpCustomerId: customerId }];
    }

    const total = await Inquiry.countDocuments(query);
    const inquiries = await Inquiry.find(query)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      // Return plain JSON objects so every list row is serialized consistently.
      .lean();

    // Older/portal-created rows may be missing the stored customerName.
    // Backfill it from the linked customer or lead so list rows never show it blank.
    await backfillCustomerNames(inquiries);
    await attachLeadNumbers(inquiries);

    return {
      inquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new InquiryService();
