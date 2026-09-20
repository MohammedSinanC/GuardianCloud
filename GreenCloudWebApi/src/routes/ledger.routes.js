import express from "express";
import { getLedger, getTransactions } from "../controllers/ledger.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

/**
 * @openapi
 * /api/ledgers/{customerId}:
 *   get:
 *     summary: Get a customer's account ledger
 *     description: Returns the ledger with opening/current balance and running transactions.
 *     tags: [Ledgers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Account ledger summary
 *       404:
 *         description: Ledger not found for customer
 */
router.get("/:customerId", getLedger);

/**
 * @openapi
 * /api/ledgers/{customerId}/transactions:
 *   get:
 *     summary: Get a customer's ledger transactions
 *     tags: [Ledgers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Transaction list with debit/credit and running balance
 *       404:
 *         description: Ledger not found for customer
 */
router.get("/:customerId/transactions", getTransactions);

export default router;
