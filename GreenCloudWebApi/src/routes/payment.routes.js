import express from "express";
import paymentController from "../controllers/payment.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// ── Payment Type Master ──────────────────────────────────────────────

/**
 * @openapi
 * /api/payment-types:
 *   get:
 *     summary: List payment type masters
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Payment type list
 */
router.get("/payment-types", paymentController.listTypes);

/**
 * @openapi
 * /api/payment-types:
 *   post:
 *     summary: Create a payment type
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string, example: Annual Contract }
 *               code: { type: string, example: ANNUAL }
 *               frequency: { type: string, enum: [ONE_TIME, MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL], example: ANNUAL }
 *               interval: { type: integer, example: 12, description: Months between payments }
 *               gracePeriodDays: { type: integer, example: 7 }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Payment type created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/payment-types", adminAuth, paymentController.createType);

/**
 * @openapi
 * /api/payment-types/{id}:
 *   put:
 *     summary: Update a payment type
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Payment type updated
 *       404:
 *         description: Payment type not found
 */
router.put("/payment-types/:id", adminAuth, paymentController.updateType);

/**
 * @openapi
 * /api/payment-types/{id}:
 *   delete:
 *     summary: Delete a payment type
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Payment type deleted
 *       404:
 *         description: Payment type not found
 */
router.delete("/payment-types/:id", adminAuth, paymentController.deleteType);

// ── Quotation (legacy, nested under inquiries) ───────────────────────

/**
 * @openapi
 * /api/inquiries/{id}/quotation:
 *   post:
 *     summary: Create a quotation for an inquiry (legacy flow)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post("/inquiries/:id/quotation", adminAuth, paymentController.createQuotation);

/**
 * @openapi
 * /api/inquiries/{id}/quotation:
 *   get:
 *     summary: Get an inquiry's quotation (legacy flow)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Quotation details
 *       404:
 *         description: Quotation not found
 */
router.get("/inquiries/:id/quotation", paymentController.getQuotation);

/**
 * @openapi
 * /api/inquiries/{id}/quotation:
 *   put:
 *     summary: Update an inquiry's quotation (legacy flow)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quotation updated
 *       404:
 *         description: Quotation not found
 */
router.put("/inquiries/:id/quotation", adminAuth, paymentController.updateQuotation);

// ── Payment Schedule ─────────────────────────────────────────────────

/**
 * @openapi
 * /api/quotations/{id}/payment-schedule/generate:
 *   post:
 *     summary: Generate a payment schedule for a quotation
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Schedule generated
 *       404:
 *         description: Quotation not found
 */
router.post("/quotations/:id/payment-schedule/generate", adminAuth, paymentController.generateSchedule);

/**
 * @openapi
 * /api/quotations/{id}/payment-schedule:
 *   get:
 *     summary: Get a quotation's payment schedule
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Payment schedule records
 *       404:
 *         description: Quotation not found
 */
router.get("/quotations/:id/payment-schedule", paymentController.getSchedule);

/**
 * @openapi
 * /api/payment-schedule/{id}:
 *   put:
 *     summary: Update a payment schedule record
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Schedule record updated
 *       404:
 *         description: Schedule record not found
 */
router.put("/payment-schedule/:id", adminAuth, paymentController.updateScheduleRecord);

/**
 * @openapi
 * /api/payment-schedule/report:
 *   get:
 *     summary: Payment schedule report
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aggregated schedule report
 */
router.get("/payment-schedule/report", paymentController.getReport);
export default router;
