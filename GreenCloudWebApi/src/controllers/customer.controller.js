import Customer from "../models/customer.model.js";
import AccountLedger from "../models/ledger.model.js";
import LedgerTransaction from "../models/ledger-transaction.model.js";
import Lead from "../models/lead.model.js";
import Inquiry from "../models/inquiry.model.js";

/** GET /api/customers — list + search + pagination */
export async function list(req, res) {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const filter = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { customerCode: rx },
        { companyName: rx },
        { contactPerson: rx },
        { mobile: rx },
        { email: rx },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Customer.countDocuments(filter),
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

/** GET /api/customers/:id — details with ledger + linked docs */
export async function getById(req, res) {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const [ledger, leads, inquiries] = await Promise.all([
      customer.ledgerId ? AccountLedger.findById(customer.ledgerId).lean() : AccountLedger.findOne({ customerId: customer._id }).lean(),
      Lead.find({ customerId: customer._id }).select("leadNo status createdAt").sort({ createdAt: -1 }).limit(10).lean(),
      Inquiry.find({ erpCustomerId: customer._id }).select("inquiryNo status currentStageCode createdAt").sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // Ledger summary (rule #19 fields)
    const txs = await LedgerTransaction.find({ customerId: customer._id }).lean();
    const totalDebit = txs.reduce((s, t) => s + (t.debit || 0), 0);
    const totalCredit = txs.reduce((s, t) => s + (t.credit || 0), 0);

    res.json({
      success: true,
      data: {
        customer,
        ledger: ledger || null,
        summary: {
          openingBalance: ledger?.openingBalance ?? 0,
          totalDebit,
          totalCredit,
          outstandingBalance: (ledger?.openingBalance ?? 0) + totalDebit - totalCredit,
        },
        leads,
        inquiries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/customers — manual creation (approval path goes through lead approve) */
export async function create(req, res) {
  try {
    const existing = await Customer.findOne({
      $or: [
        ...(req.body.email ? [{ email: req.body.email.toLowerCase() }] : []),
        ...(req.body.mobile ? [{ mobile: req.body.mobile }] : []),
      ],
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `Customer already exists (${existing.customerCode})` });
    }
    const customer = await Customer.create({
      ...req.body,
      createdBy: req.admin?._id || null,
      createdByName: req.admin?.name || req.admin?.username || "",
    });
    // Auto-create the one ledger per customer (rule #5)
    const ledger = await AccountLedger.create({
      customerId: customer._id,
      createdBy: req.admin?._id || null,
      createdByName: req.admin?.name || req.admin?.username || "",
    });
    customer.ledgerId = ledger._id;
    await customer.save();
    res.status(201).json({ success: true, data: customer, message: "Customer created successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/** PUT /api/customers/:id */
export async function update(req, res) {
  try {
    const allowed = ["companyName", "contactPerson", "mobile", "email", "address", "location", "customerType", "trnNumber", "paymentTerms", "status"];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }
    updates.updatedBy = req.admin?._id || null;
    updates.updatedByName = req.admin?.name || req.admin?.username || "";
    const customer = await Customer.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    res.json({ success: true, data: customer, message: "Customer updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/** DELETE /api/customers/:id — permanently remove a customer record */
export async function remove(req, res) {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    // Remove only the customer's ledger records; authentication users and master data stay intact.
    const ledgerFilter = customer.ledgerId
      ? { _id: customer.ledgerId }
      : { customerId: customer._id };
    await Promise.all([
      LedgerTransaction.deleteMany({ customerId: customer._id }),
      AccountLedger.deleteMany(ledgerFilter),
    ]);

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
