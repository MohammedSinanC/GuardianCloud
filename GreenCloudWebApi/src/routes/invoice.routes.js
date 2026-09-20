import express from "express";
import { create, list, getById, approve, reject, post, cancel, pdf, send } from "../controllers/invoice.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     summary: List invoices
 *     tags: [Invoices]
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
 *         schema: { type: string, enum: [DRAFT, PENDING_APPROVAL, APPROVED, POSTED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED] }
 *     responses:
 *       200:
 *         description: Paginated invoice list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     summary: Get an invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Invoice details
 *       404:
 *         description: Invoice not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/invoices:
 *   post:
 *     summary: Create an invoice
 *     tags: [Invoices]
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
 *               workOrderId: { $ref: "#/components/schemas/MongoId" }
 *               quotationId: { $ref: "#/components/schemas/MongoId" }
 *               customerId: { $ref: "#/components/schemas/MongoId" }
 *               invoiceDate: { type: string, format: date }
 *               dueDate: { type: string, format: date }
 *               paymentTerms: { type: string }
 *               bankDetails: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description: { type: string }
 *                     quantity: { type: number }
 *                     unitPrice: { type: number }
 *     responses:
 *       201:
 *         description: Invoice created
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/invoices/{id}/approve:
 *   post:
 *     summary: Approve an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Invoice approved
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Invoice not found
 */
router.post("/:id/approve", approve);

/**
 * @openapi
 * /api/invoices/{id}/reject:
 *   post:
 *     summary: Reject an invoice
 *     tags: [Invoices]
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
 *         description: Invoice rejected
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Invoice not found
 */
router.post("/:id/reject", reject);

/**
 * @openapi
 * /api/invoices/{id}/post:
 *   post:
 *     summary: Post an invoice to the customer ledger
 *     description: Creates a debit ledger transaction for the invoice total.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Invoice posted to ledger
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Invoice not found
 */
router.post("/:id/post", post);

/**
 * @openapi
 * /api/invoices/{id}/cancel:
 *   post:
 *     summary: Cancel an invoice
 *     tags: [Invoices]
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
 *         description: Invoice cancelled
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Invoice not found
 */
router.post("/:id/cancel", cancel);

/**
 * @openapi
 * /api/invoices/{id}/pdf:
 *   get:
 *     summary: Download invoice PDF
 *     tags: [Invoices]
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
 *         description: Invoice not found
 */
router.get("/:id/pdf", pdf);

/**
 * @openapi
 * /api/invoices/{id}/send:
 *   post:
 *     summary: Email an invoice to the customer
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Invoice sent
 *       400:
 *         description: Send failed
 *       404:
 *         description: Invoice not found
 */
router.post("/:id/send", send);

export default router;
