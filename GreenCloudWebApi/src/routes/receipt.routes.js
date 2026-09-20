import express from "express";
import { create, list, getById, post } from "../controllers/receipt.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

/**
 * @openapi
 * /api/receipts:
 *   get:
 *     summary: List receipts
 *     tags: [Receipts]
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
 *         schema: { type: string, enum: [DRAFT, POSTED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Paginated receipt list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/receipts/{id}:
 *   get:
 *     summary: Get a receipt by ID
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Receipt details
 *       404:
 *         description: Receipt not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/receipts:
 *   post:
 *     summary: Record a customer payment receipt
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, ledgerAccountId, paymentMethod, amount]
 *             properties:
 *               customerId: { $ref: "#/components/schemas/MongoId" }
 *               ledgerAccountId: { $ref: "#/components/schemas/MongoId" }
 *               invoiceId: { $ref: "#/components/schemas/MongoId" }
 *               paymentMethod: { type: string, enum: [CASH, BANK_TRANSFER, CARD, CHEQUE, ONLINE, OTHER] }
 *               amount: { type: number, example: 1500.5, minimum: 0.01 }
 *               referenceNo: { type: string, example: TRX-90881 }
 *               remarks: { type: string }
 *     responses:
 *       201:
 *         description: Receipt created in DRAFT
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/receipts/{id}/post:
 *   post:
 *     summary: Post a receipt to the customer ledger
 *     description: Creates a credit ledger transaction, updates the running balance and invoice payment status.
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Receipt posted
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Receipt not found
 */
router.post("/:id/post", post);

export default router;
