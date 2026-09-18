import express from "express";
import paymentController from "../controllers/payment.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Payment Type Master
router.get("/payment-types", paymentController.listTypes);
router.post("/payment-types", adminAuth, paymentController.createType);
router.put("/payment-types/:id", adminAuth, paymentController.updateType);
router.delete("/payment-types/:id", adminAuth, paymentController.deleteType);

// Quotation (nested under inquiries)
router.post("/inquiries/:id/quotation", adminAuth, paymentController.createQuotation);
router.get("/inquiries/:id/quotation", paymentController.getQuotation);
router.put("/inquiries/:id/quotation", adminAuth, paymentController.updateQuotation);

// Payment Schedule (nested under quotations)
router.post("/quotations/:id/payment-schedule/generate", adminAuth, paymentController.generateSchedule);
router.get("/quotations/:id/payment-schedule", paymentController.getSchedule);
router.put("/payment-schedule/:id", adminAuth, paymentController.updateScheduleRecord);

// Payment Schedule Report
router.get("/payment-schedule/report", paymentController.getReport);

export default router;
