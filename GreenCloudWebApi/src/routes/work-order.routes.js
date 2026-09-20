import express from "express";
import { create, list, getById, update, submit, approve, reject, start, complete, assign } from "../controllers/work-order.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();
router.use(adminAuth);

/**
 * @openapi
 * /api/work-orders:
 *   get:
 *     summary: List work orders
 *     tags: [Work Orders]
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
 *         description: Paginated work order list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/work-orders/{id}:
 *   get:
 *     summary: Get a work order by ID
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Work order details
 *       404:
 *         description: Work order not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/work-orders:
 *   post:
 *     summary: Create a work order
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quotationId, inquiryId, customerId]
 *             properties:
 *               quotationId: { $ref: "#/components/schemas/MongoId" }
 *               inquiryId: { $ref: "#/components/schemas/MongoId" }
 *               customerId: { $ref: "#/components/schemas/MongoId" }
 *               serviceType: { type: string }
 *               serviceLocation: { type: string }
 *               assignedTeam: { type: string }
 *               scheduledDate: { type: string, format: date }
 *               scheduledTime: { type: string, example: "09:00" }
 *               workDescription: { type: string }
 *               requiredMaterials: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       201:
 *         description: Work order created
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/work-orders/{id}:
 *   put:
 *     summary: Update a work order
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Work order updated
 *       404:
 *         description: Work order not found
 */
router.put("/:id", update);

/**
 * @openapi
 * /api/work-orders/{id}/assign:
 *   post:
 *     summary: Assign a technician/team to a work order
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedTeam: { type: string }
 *               assignedTechnician: { type: string }
 *     responses:
 *       200:
 *         description: Work order assigned
 *       404:
 *         description: Work order not found
 */
router.post("/:id/assign", assign);

/**
 * @openapi
 * /api/work-orders/{id}/submit:
 *   post:
 *     summary: Submit a work order for approval
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Submitted
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Work order not found
 */
router.post("/:id/submit", submit);

/**
 * @openapi
 * /api/work-orders/{id}/approve:
 *   post:
 *     summary: Approve a work order
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Approved
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Work order not found
 */
router.post("/:id/approve", approve);

/**
 * @openapi
 * /api/work-orders/{id}/reject:
 *   post:
 *     summary: Reject a work order
 *     tags: [Work Orders]
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
 *         description: Rejected
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Work order not found
 */
router.post("/:id/reject", reject);

/**
 * @openapi
 * /api/work-orders/{id}/start:
 *   post:
 *     summary: Mark a work order as started
 *     description: Stamps startedAt/startedBy for field execution tracking.
 *     tags: [Work Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Work order started
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Work order not found
 */
router.post("/:id/start", start);

/**
 * @openapi
 * /api/work-orders/{id}/complete:
 *   post:
 *     summary: Complete a work order
 *     description: Records completion notes, materials used and customer confirmation.
 *     tags: [Work Orders]
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
 *               completionNotes: { type: string }
 *               materialsUsed: { type: string }
 *               customerConfirmation: { type: string }
 *     responses:
 *       200:
 *         description: Work order completed
 *       400:
 *         description: Invalid transition
 *       404:
 *         description: Work order not found
 */
router.post("/:id/complete", complete);

export default router;
