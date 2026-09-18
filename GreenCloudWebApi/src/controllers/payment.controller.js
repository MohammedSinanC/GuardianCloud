import { PaymentTypeMaster, PaymentSchedule } from "../models/payment.model.js";
import Quotation from "../models/quotation.model.js";
import Inquiry from "../models/inquiry.model.js";
import SiteInspection from "../models/site-inspection.model.js";
import { postLedgerTransaction } from "./ledger.controller.js";

const paymentController = {
  // ==================== PAYMENT TYPE MASTER ====================

  /** GET /api/payment-types */
  async listTypes(req, res) {
    try {
      const types = await PaymentTypeMaster.find({ isActive: true }).sort({ name: 1 });
      return res.json({ success: true, data: types });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** POST /api/payment-types */
  async createType(req, res) {
    try {
      const { name, code, frequency, interval, gracePeriodDays } = req.body;
      if (!name || !code || !frequency) {
        return res.status(400).json({ success: false, message: "name, code, frequency are required" });
      }
      const type = await PaymentTypeMaster.create({
        name, code: code.toUpperCase(), frequency, interval: interval || 0,
        gracePeriodDays: gracePeriodDays || 0, isActive: true,
        createdBy: req.admin?._id,
      });
      return res.status(201).json({ success: true, data: type });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** PUT /api/payment-types/:id */
  async updateType(req, res) {
    try {
      const { id } = req.params;
      const updates = { ...req.body, updatedBy: req.admin?._id };
      delete updates.createdBy;
      const type = await PaymentTypeMaster.findByIdAndUpdate(id, updates, { new: true });
      if (!type) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, data: type });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** DELETE /api/payment-types/:id */
  async deleteType(req, res) {
    try {
      const type = await PaymentTypeMaster.findByIdAndUpdate(
        req.params.id, { isActive: false, updatedBy: req.admin?._id }, { new: true }
      );
      if (!type) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==================== QUOTATION ====================

  /** POST /api/inquiries/:id/quotation — Create/update quotation */
  async createQuotation(req, res) {
    try {
      const inquiryId = req.params.id;
      const { items, taxRate, terms, notes, paymentTypeId, paymentStartDate, gracePeriodDays, customIntervalMonths } = req.body;

      // Server-side workflow gate (see quotation-erp.controller.js): an inquiry
      // flagged for inspection needs an APPROVED Site Inspection before any new
      // quotation can be created. Updating an existing quotation stays allowed.
      const inquiry = await Inquiry.findById(inquiryId).lean();
      if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });
      let quotation = await Quotation.findOne({ inquiryId });
      if (!quotation && inquiry.siteInspectionRequired === true) {
        const inspection = await SiteInspection.findOne({ inquiryId }).lean();
        if (!inspection) return res.status(400).json({ success: false, message: "Site Inspection is required before proceeding to Quotation." });
        if (inspection.status !== "APPROVED") return res.status(400).json({ success: false, message: "Site Inspection must be approved before creating the quotation." });
      }

      if (quotation) {
        // Update existing
        if (items) quotation.items = items;
        if (taxRate !== undefined) quotation.taxRate = taxRate;
        if (terms !== undefined) quotation.terms = terms;
        if (notes !== undefined) quotation.notes = notes;
        if (paymentTypeId) quotation.paymentTypeId = paymentTypeId;
        if (paymentStartDate) quotation.paymentStartDate = paymentStartDate;
        if (gracePeriodDays !== undefined) quotation.gracePeriodDays = gracePeriodDays;
        if (customIntervalMonths !== undefined) quotation.customIntervalMonths = customIntervalMonths;

        // Recalculate
        quotation.subtotal = quotation.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
        quotation.items.forEach(i => { i.totalPrice = i.quantity * i.unitPrice; });
        quotation.taxAmount = quotation.subtotal * (quotation.taxRate / 100);
        quotation.totalAmount = quotation.subtotal + quotation.taxAmount;

        await quotation.save();
      } else {
        // Create new
        quotation = await Quotation.create({
          inquiryId,
          items: items || [],
          taxRate: taxRate || 5,
          terms: terms || "",
          notes: notes || "",
          paymentTypeId: paymentTypeId || null,
          paymentStartDate: paymentStartDate || null,
          gracePeriodDays: gracePeriodDays || 0,
          customIntervalMonths: customIntervalMonths || 1,
          status: "DRAFT",
        });
      }

      // Get payment type name
      if (quotation.paymentTypeId) {
        const pt = await PaymentTypeMaster.findById(quotation.paymentTypeId);
        if (pt) {
          quotation.paymentTypeName = pt.name;
          quotation.paymentFrequency = pt.frequency;
          await quotation.save();
        }
      }

      // Link to inquiry
      const Inquiry = (await import("../models/inquiry.model.js")).default;
      await Inquiry.findByIdAndUpdate(inquiryId, { quotationId: quotation._id });

      return res.json({ success: true, data: quotation });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** GET /api/inquiries/:id/quotation */
  async getQuotation(req, res) {
    try {
      const quotation = await Quotation.findOne({ inquiryId: req.params.id })
        .populate("paymentTypeId");
      if (!quotation) return res.status(404).json({ success: false, message: "No quotation" });
      return res.json({ success: true, data: quotation });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** PUT /api/inquiries/:id/quotation */
  async updateQuotation(req, res) {
    try {
      const quotation = await Quotation.findOne({ inquiryId: req.params.id });
      if (!quotation) return res.status(404).json({ success: false, message: "No quotation" });

      const { items, taxRate, terms, notes, status, paymentTypeId, paymentStartDate, gracePeriodDays, customIntervalMonths } = req.body;
      if (items) quotation.items = items;
      if (taxRate !== undefined) quotation.taxRate = taxRate;
      if (terms !== undefined) quotation.terms = terms;
      if (notes !== undefined) quotation.notes = notes;
      if (status) quotation.status = status;
      if (paymentTypeId) quotation.paymentTypeId = paymentTypeId;
      if (paymentStartDate) quotation.paymentStartDate = paymentStartDate;
      if (gracePeriodDays !== undefined) quotation.gracePeriodDays = gracePeriodDays;
      if (customIntervalMonths !== undefined) quotation.customIntervalMonths = customIntervalMonths;

      // Recalculate
      quotation.subtotal = quotation.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
      quotation.items.forEach(i => { i.totalPrice = i.quantity * i.unitPrice; });
      quotation.taxAmount = quotation.subtotal * (quotation.taxRate / 100);
      quotation.totalAmount = quotation.subtotal + quotation.taxAmount;

      await quotation.save();

      // Update payment type name
      if (quotation.paymentTypeId) {
        const pt = await PaymentTypeMaster.findById(quotation.paymentTypeId);
        if (pt) {
          quotation.paymentTypeName = pt.name;
          quotation.paymentFrequency = pt.frequency;
          await quotation.save();
        }
      }

      return res.json({ success: true, data: quotation });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==================== PAYMENT SCHEDULE ====================  /** POST /api/quotations/:id/payment-schedule/generate */
  async generateSchedule(req, res) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });

      const paymentType = await PaymentTypeMaster.findById(quotation.paymentTypeId);
      if (!paymentType) return res.status(400).json({ success: false, message: "Payment type not configured" });

      if (!quotation.paymentStartDate) {
        return res.status(400).json({ success: false, message: "Payment start date not configured" });
      }

      const frequency = paymentType.frequency;
      const totalAmount = quotation.totalAmount;  // amount + VAT combined
      const subtotal = quotation.subtotal;         // amount without VAT
      const taxRate = quotation.taxRate || 0;
      const startDate = new Date(quotation.paymentStartDate);
      const graceDays = quotation.gracePeriodDays || paymentType.gracePeriodDays || 0;

      // ── Determine interval and number of payments ──
      let intervalMonths, numPayments;

      if (frequency === "ONE_TIME") {
        intervalMonths = 0;
        numPayments = 1;
      } else if (frequency === "MONTHLY") {
        intervalMonths = 1;
        numPayments = 12;
      } else if (frequency === "QUARTERLY") {
        intervalMonths = 3;
        numPayments = 4;
      } else if (frequency === "YEARLY") {
        intervalMonths = 12;
        numPayments = 1;
      } else if (frequency === "HALF_YEARLY") {
        intervalMonths = 6;
        numPayments = 2;
      } else {
        // Fallback: use payment type's interval
        intervalMonths = Math.max(paymentType.interval || 1, 1);
        numPayments = Math.max(Math.round(12 / intervalMonths), 1);
      }

      numPayments = Math.max(numPayments, 1);

      // ── Calculate payment amounts with proper rounding ──
      const baseAmount = Math.floor((totalAmount / numPayments) * 100) / 100;
      const amounts = [];
      let runningTotal = 0;
      for (let i = 0; i < numPayments; i++) {
        if (i === numPayments - 1) {
          // Last payment absorbs rounding difference
          amounts.push(Math.round((totalAmount - runningTotal) * 100) / 100);
        } else {
          amounts.push(baseAmount);
          runningTotal += baseAmount;
        }
      }

      // Calculate VAT per payment proportionally
      const vatRate = taxRate / 100;
      const baseVat = vatRate > 0 ? Math.floor((subtotal / numPayments) * vatRate * 100) / 100 : 0;
      const vatAmounts = [];
      let runningVat = 0;
      for (let i = 0; i < numPayments; i++) {
        if (i === numPayments - 1) {
          const totalVat = Math.round(subtotal * vatRate * 100) / 100;
          vatAmounts.push(Math.round((totalVat - runningVat) * 100) / 100);
        } else {
          vatAmounts.push(baseVat);
          runningVat += baseVat;
        }
      }

      // ── Protect existing PAID schedules ──
      await PaymentSchedule.deleteMany({
        quotationId: quotation._id,
        status: { $ne: "PAID" },
      });

      // ── Generate schedule entries ──
      const schedule = [];
      for (let i = 0; i < numPayments; i++) {
        const paymentNo = i + 1;
        const amount = amounts[i];
        const vat = vatAmounts[i];
        const total = Math.round((amount) * 100) / 100; // amount already includes VAT proportion from totalAmount

        const payDate = new Date(startDate);
        payDate.setMonth(payDate.getMonth() + (intervalMonths * i));

        const dueDate = new Date(payDate);
        dueDate.setDate(dueDate.getDate() + graceDays);

        const record = await PaymentSchedule.create({
          quotationId: quotation._id,
          inquiryId: quotation.inquiryId,
          paymentNo,
          paymentDate: payDate,
          dueDate,
          paymentTypeId: paymentType._id,
          paymentTypeName: paymentType.name,
          paymentFrequency: frequency,
          intervalMonths,
          amount,
          vat,
          total: amount,
          status: "PENDING",
          paidAmount: 0,
          remainingAmount: amount,
        });

        schedule.push(record);
      }

      // ── Update quotation metadata ──
      quotation.numberOfPayments = numPayments;
      quotation.paymentFrequency = frequency;
      await quotation.save();

      return res.json({ success: true, data: { schedule, quotation } });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** GET /api/quotations/:id/payment-schedule */
  async getSchedule(req, res) {
    try {
      const schedule = await PaymentSchedule.find({ quotationId: req.params.id })
        .sort({ paymentNo: 1 });
      const quotation = await Quotation.findById(req.params.id);
      return res.json({ success: true, data: { schedule, quotation } });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /** PUT /api/payment-schedule/:id */
  async updateScheduleRecord(req, res) {
    try {
      const { status, paidAmount, paidDate, notes } = req.body;
      const record = await PaymentSchedule.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: "Not found" });

      if (record.status === "PAID") {
        return res.status(400).json({ success: false, message: "Cannot modify a paid record" });
      }

      if (status) record.status = status;
      if (paidAmount !== undefined) record.paidAmount = paidAmount;
      if (paidDate) record.paidDate = paidDate;
      if (notes !== undefined) record.notes = notes;
      record.remainingAmount = record.amount - record.paidAmount;

      await record.save();

      // ── ERP ledger hook: posting a schedule payment credits the customer ledger ──
      if (record.status === "PAID" && record.paidAmount > 0) {
        try {
          const inquiry = await Inquiry.findById(record.inquiryId).lean();
          if (inquiry?.erpCustomerId) {
            const { default: LedgerTransaction } = await import("../models/ledger-transaction.model.js");
            const alreadyPosted = await LedgerTransaction.findOne({
              inquiryId: record.inquiryId,
              type: "PAYMENT",
              transactionDate: { $gte: new Date(new Date(record.paidDate || record.paymentDate || Date.now()).setHours(0, 0, 0, 0)) },
              credit: record.paidAmount,
            });
            if (!alreadyPosted) {
              await postLedgerTransaction({
                customerId: inquiry.erpCustomerId,
                type: "PAYMENT",
                debit: 0,
                credit: record.paidAmount,
                referenceNo: `PAY-${record.paymentNo}-${record.quotationId?.toString().slice(-6) || ""}`,
                description: `Payment ${record.paymentNo} of ${record.paymentTypeName || "schedule"}`,
                inquiryId: record.inquiryId,
                quotationId: record.quotationId,
                actorId: req.admin?._id || null,
                actorName: req.admin?.name || req.admin?.username || "",
                transactionDate: record.paidDate || new Date(),
              });
            }
          }
        } catch (ledgerErr) {
          // Payment record is saved; ledger failure should not lose the payment update
          console.error("Ledger posting failed for schedule payment:", ledgerErr.message);
        }
      }

      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==================== PAYMENT SCHEDULE REPORT ====================

  /** GET /api/payment-schedule/report */
  async getReport(req, res) {
    try {
      const { dateFrom, dateTo, status, paymentType, inquiryId, customer, search } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build query filter
      const filter = {};
      if (dateFrom || dateTo) {
        filter.dueDate = {};
        if (dateFrom) filter.dueDate.$gte = new Date(dateFrom);
        if (dateTo) filter.dueDate.$lte = new Date(dateTo);
      }
      if (paymentType) filter.paymentFrequency = paymentType;
      if (inquiryId) filter.inquiryId = inquiryId;
      if (status) {
        if (status === 'PAID') filter.status = 'PAID';
        else if (status === 'OVERDUE') { filter.status = { $ne: 'PAID' }; filter.dueDate = { $lt: today }; }
        else if (status === 'PENDING') filter.status = 'PENDING';
      }

      let schedule = await PaymentSchedule.find(filter)
        .populate('inquiryId', 'inquiryNo customerName contactPerson serviceLocation')
        .populate('quotationId', 'quotationNo totalAmount')
        .sort({ dueDate: 1 });

      // Filter by customer/search after population
      if (customer) {
        const c = customer.toLowerCase();
        schedule = schedule.filter(p => {
          const inq = p.inquiryId;
          return inq && (
            (inq.customerName || '').toLowerCase().includes(c) ||
            (inq.contactPerson || '').toLowerCase().includes(c)
          );
        });
      }
      if (search) {
        const s = search.toLowerCase();
        schedule = schedule.filter(p => {
          const inq = p.inquiryId;
          const qt = p.quotationId;
          return (
            (inq?.inquiryNo || '').toLowerCase().includes(s) ||
            (inq?.customerName || '').toLowerCase().includes(s) ||
            (inq?.contactPerson || '').toLowerCase().includes(s) ||
            (qt?.quotationNo || '').toLowerCase().includes(s)
          );
        });
      }

      // Compute effective status for each record
      const enriched = schedule.map(p => {
        const dueDate = new Date(p.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        let effectiveStatus = p.status;
        if (p.status !== 'PAID') {
          if (dueDate < today) effectiveStatus = 'OVERDUE';
          else if (dueDate.getTime() === today.getTime()) effectiveStatus = 'DUE_TODAY';
          else effectiveStatus = 'UPCOMING';
        }
        return { ...p.toObject(), effectiveStatus };
      });

      // Summary stats
      const upcoming = enriched.filter(p => p.effectiveStatus === 'UPCOMING');
      const overdue = enriched.filter(p => p.effectiveStatus === 'OVERDUE');
      const dueToday = enriched.filter(p => p.effectiveStatus === 'DUE_TODAY');
      const paid = enriched.filter(p => p.effectiveStatus === 'PAID');

      const summary = {
        totalPayments: enriched.length,
        upcomingCount: upcoming.length,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
        paidCount: paid.length,
        upcomingAmount: upcoming.reduce((s, p) => s + (p.total || p.amount), 0),
        overdueAmount: overdue.reduce((s, p) => s + (p.total || p.amount), 0),
        dueTodayAmount: dueToday.reduce((s, p) => s + (p.total || p.amount), 0),
        paidAmount: paid.reduce((s, p) => s + (p.total || p.amount), 0),
        totalDueAmount: upcoming.reduce((s, p) => s + (p.total || p.amount), 0)
          + overdue.reduce((s, p) => s + (p.total || p.amount), 0)
          + dueToday.reduce((s, p) => s + (p.total || p.amount), 0),
      };

      return res.json({ success: true, data: { schedule: enriched, summary } });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default paymentController;
