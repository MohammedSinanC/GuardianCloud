import express from "express";
import inquiryController from "../controllers/inquiry.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Public: Create inquiry (customer)
router.post("/", inquiryController.create);

// Public: List inquiries
router.get("/", inquiryController.list);

// Public: Get inquiry stats
router.get("/stats", inquiryController.getStats);

// Public: Get inquiry by ID
router.get("/:id", inquiryController.getById);

// Protected: save an inquiry as a draft
router.post("/:id/draft", adminAuth, inquiryController.saveDraft);

// Protected: approve an inquiry and create exactly one downstream draft
router.post("/:id/approve", adminAuth, inquiryController.approve);

// Protected: reject an inquiry
router.post("/:id/reject", adminAuth, inquiryController.reject);

// Protected: Update inquiry (admin or owner)
router.put("/:id", adminAuth, inquiryController.update);;

// Protected: Delete inquiry
router.delete("/:id", adminAuth, inquiryController.delete);

export default router;
