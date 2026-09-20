import express from "express";
import inquiryController from "../controllers/inquiry.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/inquiries:
 *   post:
 *     summary: Create an inquiry
 *     description: Public endpoint — customers can submit an inquiry without authentication.
 *     tags: [Inquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName: { type: string }
 *               companyName: { type: string }
 *               contactPerson: { type: string }
 *               mobile: { type: string }
 *               email: { type: string, format: email }
 *               source: { type: string, example: PHONE }
 *               serviceType: { type: string }
 *               pestTypes: { type: array, items: { type: string } }
 *               serviceLocation: { type: string }
 *               problemDescription: { type: string }
 *               preferredDate: { type: string, format: date }
 *               preferredTime: { type: string, example: "10:00 AM" }
 *               remarks: { type: string }
 *     responses:
 *       201:
 *         description: Inquiry created
 *       400:
 *         description: Validation error
 */
router.post("/", inquiryController.create);

/**
 * @openapi
 * /api/inquiries:
 *   get:
 *     summary: List inquiries
 *     tags: [Inquiries]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, example: CREATED }
 *     responses:
 *       200:
 *         description: Paginated inquiry list
 */
router.get("/", inquiryController.list);

/**
 * @openapi
 * /api/inquiries/stats:
 *   get:
 *     summary: Inquiry statistics
 *     tags: [Inquiries]
 *     responses:
 *       200:
 *         description: Inquiry counts grouped by status/stage
 */
router.get("/stats", inquiryController.getStats);

/**
 * @openapi
 * /api/inquiries/{id}:
 *   get:
 *     summary: Get an inquiry by ID
 *     tags: [Inquiries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Inquiry details
 *       404:
 *         description: Inquiry not found
 */
router.get("/:id", inquiryController.getById);

/**
 * @openapi
 * /api/inquiries/{id}/draft:
 *   post:
 *     summary: Save an inquiry as a draft
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Draft saved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 */
router.post("/:id/draft", adminAuth, inquiryController.saveDraft);

/**
 * @openapi
 * /api/inquiries/{id}/approve:
 *   post:
 *     summary: Approve an inquiry
 *     description: Approves the inquiry and creates exactly one downstream draft (site inspection).
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Inquiry approved with downstream document created
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Inquiry not found
 */
router.post("/:id/approve", adminAuth, inquiryController.approve);

/**
 * @openapi
 * /api/inquiries/{id}/reject:
 *   post:
 *     summary: Reject an inquiry
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: Out of service area }
 *     responses:
 *       200:
 *         description: Inquiry rejected
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Inquiry not found
 */
router.post("/:id/reject", adminAuth, inquiryController.reject);

/**
 * @openapi
 * /api/inquiries/{id}:
 *   put:
 *     summary: Update an inquiry
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: same as create
 *         schema: { $ref: "#/components/schemas/Mongoid" }
 *     responses:
 *       200:
 *         description: Inquiry updated
 *       404:
 *         description: Inquiry not found
 */
router.put("/:id", adminAuth, inquiryController.update);

/** * @openapi
 * /api/inquiries/{id}:
 *   delete:
 *     summary: Delete an inquiry
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Inquiry deleted
 *       404:
 *         description: Inquiry not found
 */
router.delete("/:id", adminAuth, inquiryController.delete);

export default router;
