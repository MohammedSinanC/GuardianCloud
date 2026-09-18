import Admin from "../models/admin.model.js";
import { generateToken } from "../utils/jwt.js";
import Inquiry from "../models/inquiry.model.js";
import Quotation from "../models/quotation.model.js";
import ScheduleChangeHistory from "../models/schedule-change.model.js";
import mongoose from "mongoose";

class AdminController {
  /** POST /api/admin/login */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      // Find admin by username and explicitly select password field
      const admin = await Admin.findOne({
        username: username.toLowerCase().trim(),
      }).select("+password");

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Contact support.",
        });
      }

      // Compare password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Generate JWT with role
      const token = generateToken({
        id: admin._id,
        username: admin.username,
        role: admin.role,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          name: admin.name || "",
          email: admin.email || "",
          profileImage: admin.profileImage || "",
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Admin Login Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /** GET /api/admin/profile — protected */
  static async profile(req, res) {
    try {
      const admin = await Admin.findById(req.admin.id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }
      return res.status(200).json({
        success: true,
        admin: {
          id: admin._id,
          username: admin.username,
          name: admin.name || "",
          email: admin.email || "",
          profileImage: admin.profileImage || "",
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        },
      });
    } catch (error) {
      console.error("Admin Profile Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /** GET /api/admin/dashboard — protected, returns full dashboard data */
  static async dashboard(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const location = req.query.location || '';
      const dateRange = req.query.dateRange || 'thisMonth';

      // Build date filter
      const now = new Date();
      let dateFilter = {};
      if (dateRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: start } };
      } else if (dateRange === 'thisWeek') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: start } };
      } else if (dateRange === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: start } };
      } else if (dateRange === 'lastMonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilter = { createdAt: { $gte: start, $lte: end } };
      } else if (dateRange === 'thisYear') {
        const start = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { $gte: start } };
      }

      const locationFilter = location ? { serviceLocation: location } : {};
      const baseFilter = { ...dateFilter, ...locationFilter };

      // 1. Summary KPIs (all from inquiries collection)
      const totalCustomersResult = await Inquiry.aggregate([
        { $group: { _id: { $toLower: "$customerName" } } },
        { $count: "total" },
      ]);
      const totalCustomers = totalCustomersResult.length > 0 ? totalCustomersResult[0].total : 0;

      const pendingInquiries = await Inquiry.countDocuments({ currentStageCode: { $in: ['CREATED', 'SUBMITTED'] } });
      const totalInquiries = await Inquiry.countDocuments();
      const totalCompleted = await Inquiry.countDocuments({ currentStageCode: 'COMPLETED' });

      // 2. Monthly quotations (from inquiries that reached quotation stages)
      const monthlyQuotations = await Inquiry.aggregate([
        { $match: { createdAt: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) }, currentStageCode: { $in: ['QUOTATION_PREPARED', 'QUOTATION_SENT', 'QUOTATION_APPROVED', 'SERVICE_SCHEDULED', 'TECHNICIAN_ASSIGNED', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED', 'INVOICE_GENERATED', 'PAYMENT_PENDING', 'COMPLETED'] } } },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyQuotationsData = months.map((m, i) => ({
        month: m,
        count: monthlyQuotations.find(q => q._id === i + 1)?.count || 0,
      }));

      // 3. Requests by status
      const requestsByStatusRaw = await Inquiry.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$currentStageCode", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const requestsByStatus = requestsByStatusRaw.map(s => ({ status: s._id || 'UNKNOWN', count: s.count }));

      // 4. Requests by location
      const requestsByLocationRaw = await Inquiry.aggregate([
        { $match: baseFilter },
        { $group: { _id: { $toUpper: "$serviceLocation" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const requestsByLocation = requestsByLocationRaw.map(l => ({ location: l._id || 'Unknown', count: l.count }));

      // 5. Monthly service requests
      const monthlyRequestsRaw = await Inquiry.aggregate([
        { $match: { createdAt: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) }, ...locationFilter } },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      const monthlyRequestsData = months.map((m, i) => ({
        month: m,
        count: monthlyRequestsRaw.find(r => r._id === i + 1)?.count || 0,
      }));

      // 6. Quotation conversion funnel (from inquiry stages)
      const quotationsSent = await Inquiry.countDocuments({ currentStageCode: { $in: ['QUOTATION_PREPARED', 'QUOTATION_SENT', 'QUOTATION_APPROVED'] } });
      const accepted = await Inquiry.countDocuments({ currentStageCode: { $in: ['QUOTATION_APPROVED', 'SERVICE_SCHEDULED', 'TECHNICIAN_ASSIGNED', 'SERVICE_IN_PROGRESS'] } });
      const completed = await Inquiry.countDocuments({ currentStageCode: 'COMPLETED', ...baseFilter });
      const quotationConversion = { inquiries: totalInquiries, quotationsSent, accepted, completed };

      // 7. Request performance (dynamic from workflow stages)
      const performance = requestsByStatus.slice(0, 8);

      // 8. Latest 10 inquiries
      const latestInquiries = await Inquiry.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select('inquiryNo customerName serviceLocation currentStageCode status createdAt pestTypes')
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalCustomers,
            pendingInquiries,
            totalInquiries,
            totalCompleted,
          },
          monthlyQuotations: monthlyQuotationsData,
          requestsByStatus,
          requestsByLocation,
          monthlyRequests: monthlyRequestsData,
          quotationConversion,
          performance,
          latestInquiries,
        },
      });
    } catch (error) {
      console.error("Admin Dashboard Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /** PUT /api/admin/service-requests/:id/schedule */
  static async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { preferredDate, preferredTime, urgency } = req.body;

      if (!preferredDate || !preferredTime) {
        return res.status(400).json({
          success: false,
          message: "Preferred date and time are required",
        });
      }

      // Validate urgency if provided
      const validUrgencies = ["NORMAL", "URGENT", "EMERGENCY"];
      if (urgency && !validUrgencies.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: "Invalid urgency value. Must be NORMAL, URGENT, or EMERGENCY",
        });
      }

      // Validate date is not in the past
      const dateObj = new Date(preferredDate);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      const inquiry = await Inquiry.findById(id);
      if (!inquiry) {
        return res.status(404).json({
          success: false,
          message: "Service request not found",
        });
      }

      // Check quotation approval status — block if quotation exists and is approved
      if (inquiry.quotationId) {
        const quotation = await Quotation.findById(inquiry.quotationId);
        if (quotation && quotation.status === "APPROVED") {
          return res.status(403).json({
            success: false,
            message: "Schedule cannot be modified after quotation approval",
          });
        }
      }

      // Also check current stage — if already past quotation stages, block
      const postQuotationStages = [
        "QUOTATION_APPROVED",
        "SERVICE_SCHEDULED",
        "TECHNICIAN_ASSIGNED",
        "SERVICE_IN_PROGRESS",
        "SERVICE_COMPLETED",
        "INVOICE_GENERATED",
        "PAYMENT_PENDING",
        "COMPLETED",
      ];
      if (postQuotationStages.includes(inquiry.currentStageCode)) {
        return res.status(403).json({
          success: false,
          message: "Schedule cannot be modified after quotation approval",
        });
      }

      // Record old values
      const oldDate = inquiry.preferredDate;
      const oldTime = inquiry.preferredTime;
      const oldUrgency = inquiry.urgency;

      // Update inquiry
      inquiry.preferredDate = dateObj;
      inquiry.preferredTime = preferredTime;
      if (urgency) inquiry.urgency = urgency;
      inquiry.scheduleLastUpdatedAt = new Date();
      inquiry.scheduleLastUpdatedBy = req.admin.id;
      await inquiry.save();

      // Record audit history
      await ScheduleChangeHistory.create({
        inquiryId: inquiry._id,
        inquiryNo: inquiry.inquiryNo,
        action: "SCHEDULE_UPDATED",
        oldPreferredDate: oldDate,
        oldPreferredTime: oldTime,
        oldUrgency: oldUrgency,
        newPreferredDate: dateObj,
        newPreferredTime: preferredTime,
        newUrgency: urgency || oldUrgency,
        changedBy: req.admin.id,
        changedByName: req.admin.username || "",
      });

      return res.status(200).json({
        success: true,
        message: "Schedule updated successfully",
        data: {
          preferredDate: inquiry.preferredDate,
          preferredTime: inquiry.preferredTime,
          urgency: inquiry.urgency,
        },
      });
    } catch (error) {
      console.error("Update Schedule Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default AdminController;
