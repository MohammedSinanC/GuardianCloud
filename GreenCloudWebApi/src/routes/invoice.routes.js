import express from "express";
import { create, list, getById, update, approve, reject, post, cancel, pdf, send } from "../controllers/invoice.controller.js";
import { selectPaymentType, getInvoiceSchedule, collectPayment, receiptPdf } from "../controllers/invoice-payment.controller.js";
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
 * /api/invoices/{id}:
 *   put:
 *     summary: Edit a draft invoice (items and details) before approval
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
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description: { type: string }
 *                     quantity: { type: number }
 *                     unitPrice: { type: number }
 *               dueDate: { type: string, format: date }
 *               notes: { type: string }
 *               bankDetails: { type: string }
 *               paymentTerms: { type: string }
 *     responses:
 *       200:
 *         description: Invoice updated
 *       400:
 *         description: Invalid items or invoice already approved
 *       404:
 *         description: Invoice not found
 */
router.put("/:id", update);

/**
 * @openapi
 * /api/invoices/{id}/payment-type:
 *   put:
 *     summary: Select payment type — loads terms and generates the payment schedule
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentTypeId]
 *             properties:
 *               paymentTypeId: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Payment type selected and schedule generated
 *       400:
 *         description: Invalid payment type or invoice not editable
 */
router.put("/:id/payment-type", selectPaymentType);

/**
 * @openapi
 * /api/invoices/{id}/payment-schedule:
 *   get:
 *     summary: Invoice payment schedule with derived statuses, collection summary and receipts
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Schedule rows, summary and receipt list
 */
router.get("/:id/payment-schedule", getInvoiceSchedule);

/**
 * @openapi
 * /api/invoices/{id}/collect:
 *   post:
 *     summary: Record a payment against an installment — receipt, schedule, invoice and ledger updated in one transaction
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduleId, amount]
 *             properties:
 *               scheduleId: { $ref: "#/components/schemas/MongoId" }
 *               amount: { type: number }
 *               paymentMethod: { type: string, enum: [CASH, BANK_TRANSFER, CARD, CHEQUE, ONLINE, OTHER] }
 *               referenceNo: { type: string }
 *               remarks: { type: string }
 *               paymentDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Payment recorded with receipt generated
 *       400:
 *         description: Invalid amount or overpayment
 *       409:
 *         description: Duplicate reference
 */
router.post("/:id/collect", collectPayment);

/**
 * @openapi
 * /api/invoices/{id}/receipts/{receiptId}/pdf:
 *   get:
 *     summary: Download a payment receipt PDF
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PDF file stream
 */
router.get("/:id/receipts/:receiptId/pdf", receiptPdf);

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
