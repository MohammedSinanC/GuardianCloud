import express from "express";
import { approve, reject, submit, list, getById, create, update, pdf, send } from "../controllers/quotation-erp.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

/**
 * @openapi
 * /api/quotations:
 *   get:
 *     summary: List quotations
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
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
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated quotation list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/quotations/{id}:
 *   get:
 *     summary: Get a quotation by ID
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Quotation details
 *       404:
 *         description: Quotation not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/quotations:
 *   post:
 *     summary: Create a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inquiryId: { $ref: "#/components/schemas/MongoId" }
 *               customerId: { $ref: "#/components/schemas/MongoId" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description: { type: string }
 *                     quantity: { type: number }
 *                     unitPrice: { type: number }
 *                     total: { type: number }
 *     responses:
 *       201:
 *         description: Quotation created
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/quotations/{id}:
 *   put:
 *     summary: Update a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Quotation updated
 *       404:
 *         description: Quotation not found
 */
router.put("/:id", update);

/**
 * @openapi
 * /api/quotations/{id}/submit:
 *   post:
 *     summary: Submit a quotation for approval
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Quotation submitted
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Quotation not found
 */
router.post("/:id/submit", submit);

/**
 * @openapi
 * /api/quotations/{id}/approve:
 *   post:
 *     summary: Approve a quotation
 *     description: Creates the downstream work order / site inspection draft.
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Quotation approved
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Quotation not found
 */
router.post("/:id/approve", approve);

/**
 * @openapi
 * /api/quotations/{id}/reject:
 *   post:
 *     summary: Reject a quotation
 *     tags: [Quotations]
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Quotation rejected
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Quotation not found
 */
router.post("/:id/reject", reject);

/**
 * @openapi
 * /api/quotations/{id}/pdf:
 *   get:
 *     summary: Download quotation PDF
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: PDF file stream
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       404:
 *         description: Quotation not found
 */
router.get("/:id/pdf", pdf);

/**
 * @openapi
 * /api/quotations/{id}/send:
 *   post:
 *     summary: Email a quotation to the customer
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Quotation sent
 *       400:
 *         description: Send failed
 *       404:
 *         description: Quotation not found
 */
router.post("/:id/send", send);

export default router;
