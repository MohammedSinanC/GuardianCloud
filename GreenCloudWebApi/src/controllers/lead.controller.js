import Lead from "../models/lead.model.js";
import Customer from "../models/customer.model.js";
import AccountLedger from "../models/ledger.model.js";
import Inquiry from "../models/inquiry.model.js";
import Admin from "../models/admin.model.js";
import { withTransaction, findOne, findById, createDoc } from "../utils/tx.js";
import { recordHistory } from "../services/document-workflow.service.js";

// ===== Helpers =====

/** Info of the acting admin for audit fields */
function actor(req) {
  return {
    id: req.admin?._id || null,
    name: req.admin?.name || req.admin?.username || "",
  };
}

/** Business rule #1: a lead cannot be approved without mandatory info */
function validateMandatory(lead) {
  const missing = [];
  if (!lead.companyName?.trim()) missing.push("Company name");
  if (!lead.contactPerson?.trim()) missing.push("Contact person");
  if (!lead.mobile?.trim()) missing.push("Mobile");
  if (!lead.serviceRequired?.trim()) missing.push("Service required");
  return missing;
}

// ===== CRUD =====

/** POST /api/leads/public — website contact submission, always pending admin approval */
export async function createPublic(req, res) {
  try {
    const payload = {
      ...req.body,
      status: "DRAFT",
      source: "WEBSITE",
      createdBy: null,
      createdByName: "Website visitor",
      submittedBy: null,
      submittedDate: new Date(),
    };
    const missing = validateMandatory(payload);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit: missing mandatory fields — ${missing.join(", ")}`,
      });
    }
    const lead = await Lead.create(payload);
    res.status(201).json({
      success: true,
      data: lead,
      message: "Message submitted successfully",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/** POST /api/leads — create a lead (DRAFT, or PENDING_APPROVAL when status is passed) */
export async function create(req, res) {
  try {
    const a = actor(req);
    const payload = { ...req.body, createdBy: a.id, createdByName: a.name };
    if (payload.status === "PENDING_APPROVAL") {
      const missing = validateMandatory(payload);
      if (missing.length) {
        return res.status(400).json({ success: false, message: `Cannot submit: missing mandatory fields — ${missing.join(", ")}` });
      }
      payload.submittedBy = a.id;
      payload.submittedDate = new Date();
    }
    const lead = await Lead.create(payload);
    res.status(201).json({ success: true, data: lead, message: "Lead created successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/** GET /api/leads — list with search/status filter + pagination */
export async function list(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { leadNo: rx },
        { companyName: rx },
        { contactPerson: rx },
        { mobile: rx },
        { email: rx },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Lead.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/leads/:id — lead details */
export async function getById(req, res) {
  try {
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** PUT /api/leads/:id — edit (only DRAFT or REJECTED leads are editable) */
export async function update(req, res) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (!["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(lead.status)) {
      return res.status(400).json({ success: false, message: `Lead in status ${lead.status} cannot be edited` });
    }
    const allowed = ["companyName", "contactPerson", "mobile", "email", "address", "location", "source", "serviceRequired", "preferredDate", "preferredTime", "description", "notes"];
    for (const k of allowed) {
      if (k in req.body) lead[k] = req.body[k];
    }
    if ("customerId" in req.body) {
      if (req.body.customerId === null || req.body.customerId === "") {
        lead.customerId = null;
      } else if (!String(req.body.customerId).match(/^[a-f\d]{24}$/i) || !(await Customer.exists({ _id: req.body.customerId }))) {
        return res.status(400).json({ success: false, message: "Selected customer was not found" });
      } else {
        lead.customerId = req.body.customerId;
      }
    }
    if ("status" in req.body) {
      if (!["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Invalid lead status" });
      }
      lead.status = req.body.status;
    }
    const a = actor(req);
    lead.updatedBy = a.id;
    lead.updatedByName = a.name;
    // Resubmitting a rejected lead → back to pending approval
    if (req.body.resubmit === true) {
      const missing = validateMandatory(lead);
      if (missing.length) {
        return res.status(400).json({ success: false, message: `Cannot resubmit: missing mandatory fields — ${missing.join(", ")}` });
      }
      lead.status = "PENDING_APPROVAL";
      lead.rejectionReason = "";
      lead.rejectedBy = null;
      lead.rejectedByName = "";
      lead.rejectedDate = null;
      lead.submittedBy = a.id;
      lead.submittedDate = new Date();
    }
    await lead.save();
    res.json({ success: true, data: lead, message: req.body.resubmit ? "Lead resubmitted for approval" : "Lead updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/** DELETE /api/leads/:id — delete a DRAFT lead */
export async function remove(req, res) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (lead.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only DRAFT leads can be deleted" });
    }
    await lead.deleteOne();
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/leads/:id/submit — DRAFT → PENDING_APPROVAL */
export async function submit(req, res) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (lead.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: `Only DRAFT leads can be submitted (current: ${lead.status})` });
    }
    const missing = validateMandatory(lead);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Cannot submit: missing mandatory fields — ${missing.join(", ")}` });
    }
    const a = actor(req);
    lead.status = "PENDING_APPROVAL";
    lead.submittedBy = a.id;
    lead.submittedDate = new Date();
    await lead.save();
    res.json({ success: true, data: lead, message: "Lead submitted for approval" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/leads/:id/reject — requires rejectionReason (rule #2) */
export async function reject(req, res) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (lead.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ success: false, message: `Only PENDING_APPROVAL leads can be rejected (current: ${lead.status})` });
    }
    const reason = (req.body?.reason || "").toString().trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }
    const a = actor(req);
    lead.status = "REJECTED";
    lead.rejectionReason = reason;
    lead.rejectedBy = a.id;
    lead.rejectedByName = a.name;
    lead.rejectedDate = new Date();
    await lead.save();
    res.json({ success: true, data: lead, message: "Lead rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/leads/:id/approve — the ERP transaction:
 * Lead → Customer (find-or-create) → Customer user → Ledger → Inquiry.
 * Idempotent: an already-approved lead returns its existing chain (rule #15).
 */
export async function approve(req, res) {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    if (lead.status === "APPROVED") {
      const existingInquiry = lead.inquiryId
        ? await Inquiry.findById(lead.inquiryId).lean()
        : await Inquiry.findOne({ leadId: lead._id }).lean();
      const approvedLead = lead.toObject();
      if (existingInquiry && !approvedLead.inquiryId) approvedLead.inquiryId = existingInquiry._id;
      return res.json({
        success: true,
        data: {
          ...approvedLead,
          inquiryId: existingInquiry?._id || approvedLead.inquiryId || null,
          inquiryNo: existingInquiry?.inquiryNo || null,
        },
        message: "Lead was already approved",
        alreadyApproved: true,
      });
    }
    if (lead.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ success: false, message: `Only PENDING_APPROVAL leads can be approved (current: ${lead.status})` });
    }
    const missing = validateMandatory(lead);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Cannot approve: missing mandatory fields — ${missing.join(", ")}` });
    }

    const a = actor(req);

    const requestedCustomerId = req.body?.customerId || lead.customerId;
    if (requestedCustomerId && !String(requestedCustomerId).match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ success: false, message: "Invalid existing customer selection" });
    }

    const result = await withTransaction(async (session) => {
      // ── 1. Find the selected existing Customer, or match/create one ──
      let customer = requestedCustomerId
        ? await findById(Customer, requestedCustomerId, session)
        : await findOne(Customer, {
            $or: [
              ...(lead.email ? [{ email: lead.email.toLowerCase() }] : []),
              { mobile: lead.mobile },
            ],
          }, session);

      if (requestedCustomerId && !customer) {
        const error = new Error("Selected customer was not found");
        error.statusCode = 404;
        throw error;
      }

      let customerCreated = false;
      if (!customer) {
        customer = await createDoc(Customer, {
          companyName: lead.companyName,
          contactPerson: lead.contactPerson,
          mobile: lead.mobile,
          email: lead.email || "",
          address: lead.address || "",
          location: lead.location || "",
          customerType: "COMPANY",
          sourceLeadId: lead._id,
          createdBy: a.id,
          createdByName: a.name,
        }, session);
        customerCreated = true;
      }

      // ── 2. Reuse the linked customer login, or create one if missing ──
      const userEmail = (customer.email || `${customer.mobile}@customers.local`).toLowerCase();
      let user = customer.userId ? await findById(Admin, customer.userId, session) : null;
      if (!user) user = await findOne(Admin, { username: userEmail }, session);
      let tempPassword = null;
      if (!user) {
        tempPassword = `GC${Math.random().toString(36).slice(2, 10)}!`;
        user = await createDoc(Admin, {
          username: userEmail,
          name: customer.contactPerson || customer.companyName,
          email: customer.email || userEmail,
          mobile: customer.mobile,
          password: tempPassword,
          role: "admin",
          isActive: true,
        }, session);
      }

      // ── 3. Reuse or create the customer's ledger ──
      const customerUpdates = {};
      if (!customer.userId || String(customer.userId) !== String(user._id)) customerUpdates.userId = user._id;

      let ledger = customer.ledgerId
        ? await findById(AccountLedger, customer.ledgerId, session)
        : await findOne(AccountLedger, { customerId: customer._id }, session);
      let ledgerCreated = false;
      if (!ledger) {
        ledger = await createDoc(AccountLedger, {
          customerId: customer._id,
          openingBalance: 0,
          currentBalance: 0,
          createdBy: a.id,
          createdByName: a.name,
        }, session);
        ledgerCreated = true;
      }
      if (!customer.ledgerId || String(customer.ledgerId) !== String(ledger._id)) customerUpdates.ledgerId = ledger._id;
      if (Object.keys(customerUpdates).length) {
        await Customer.updateOne({ _id: customer._id }, { $set: customerUpdates }, session ? { session } : {});
      }

      // ── 4. Create Inquiry from the lead — idempotent ──
      const leadLocation = lead.location || lead.address || customer.location || customer.address || "";
      let inquiry = lead.inquiryId
        ? await findById(Inquiry, lead.inquiryId, session)
        : null;
      if (!inquiry) inquiry = await findOne(Inquiry, { leadId: lead._id }, session);
      if (!inquiry) {
        inquiry = await createDoc(Inquiry, {
          customerId: customer._id,
          erpCustomerId: customer._id,
          leadId: lead._id,
          customerName: lead.customerName || lead.companyName || customer.companyName || customer.contactPerson || "",
          companyName: lead.companyName || customer.companyName || "",
          contactPerson: lead.contactPerson,
          mobile: lead.mobile,
          email: lead.email || customer.email || "",
          source: lead.source || "PHONE",
          serviceType: lead.serviceRequired || "",
          pestTypes: lead.serviceRequired ? [lead.serviceRequired] : [],
          serviceLocation: leadLocation,
          location: leadLocation,
          problemDescription: lead.description || lead.serviceRequired || "",
          preferredDate: lead.preferredDate || null,
          preferredTime: lead.preferredTime || "",
          remarks: `Created from lead ${lead.leadNo}${lead.notes ? ` — ${lead.notes}` : ""}`,
          // CREATED is the configured initial stage of the PEST_CONTROL workflow
          status: "CREATED",
          currentStageCode: "CREATED",
          createdBy: a.id,
          createdByName: a.name,
        }, session);
      } else {
        // Backfill the customer name on inquiries created by older conversions.
        if (!inquiry.customerName) inquiry.customerName = lead.customerName || lead.companyName || customer.companyName || customer.contactPerson || "";
        if (!inquiry.companyName) inquiry.companyName = lead.companyName || customer.companyName || "";
        if (!inquiry.contactPerson) inquiry.contactPerson = lead.contactPerson || customer.contactPerson || "";
        await inquiry.save(session ? { session } : undefined);
      }

      // ── 5. Stamp the lead APPROVED with chain references ──
      const stamp = {
        status: "APPROVED",
        customerId: customer._id,
        inquiryId: inquiry._id,
        approvedBy: a.id,
        approvedByName: a.name,
        approvedDate: new Date(),
      };
      await Lead.updateOne({ _id: lead._id }, { $set: stamp }, session ? { session } : {});

      await recordHistory({ documentType: "LEAD", documentId: lead._id, action: "APPROVED", oldStatus: "PENDING_APPROVAL", newStatus: "APPROVED", actorId: a.id, actorName: a.name, session });
      return { customer, user, tempPassword, ledger, ledgerCreated, inquiry, customerCreated };
    });

    res.json({
      success: true,
      message: "Lead approved and linked to the selected customer account.",
      data: {
        lead: await Lead.findById(lead._id).lean(),
        customerId: result.customer._id,
        customerCode: result.customer.customerCode,
        customerCreated: result.customerCreated,
        userId: result.user?._id || null,
        tempPassword: result.tempPassword || undefined,
        ledgerId: result.ledger._id,
        ledgerCreated: result.ledgerCreated,
        inquiryId: result.inquiry._id,
        inquiryNo: result.inquiry.inquiryNo,
      },
    });
  } catch (err) {
    console.error("Approve lead error:", err);
    res.status(500).json({ success: false, message: `Unable to approve lead: ${err.message}` });
  }
}
