import express from "express";
import { create, list, getById, update, submit, approve, reject } from "../controllers/site-inspection.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();
router.use(adminAuth);

/**
 * @openapi
 * /api/site-inspections:
 *   get:
 *     summary: List site inspections
 *     tags: [Site Inspections]
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
 *         schema: { type: string, enum: [DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Paginated site inspection list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/site-inspections/{id}:
 *   get:
 *     summary: Get a site inspection by ID
 *     tags: [Site Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Site inspection details
 *       404:
 *         description: Site inspection not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/site-inspections:
 *   post:
 *     summary: Create a site inspection
 *     tags: [Site Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inquiryId, customerId]
 *             properties:
 *               inquiryId: { $ref: "#/components/schemas/MongoId" }
 *               customerId: { $ref: "#/components/schemas/MongoId" }
 *               inspectionDate: { type: string, format: date }
 *               location: { type: string }
 *               inspector: { type: string }
 *               inspectionType: { type: string }
 *               findings: { type: string }
 *               pestType: { type: string }
 *               affectedArea: { type: string }
 *               severity: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL], default: MEDIUM }
 *               recommendations: { type: string }
 *               requiredTreatment: { type: string }
 *               estimatedWork: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       201:
 *         description: Site inspection created
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/site-inspections/{id}:
 *   put:
 *     summary: Update a site inspection
 *     tags: [Site Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Site inspection updated
 *       404:
 *         description: Site inspection not found
 */
router.put("/:id", update);

/**
 * @openapi
 * /api/site-inspections/{id}/submit:
 *   post:
 *     summary: Submit a site inspection for approval
 *     tags: [Site Inspections]
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
 *         description: Site inspection not found
 */
router.post("/:id/submit", submit);

/**
 * @openapi
 * /api/site-inspections/{id}/approve:
 *   post:
 *     summary: Approve a site inspection
 *     tags: [Site Inspections]
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
 *         description: Site inspection not found
 */
router.post("/:id/approve", approve);

/**
 * @openapi
 * /api/site-inspections/{id}/reject:
 *   post:
 *     summary: Reject a site inspection
 *     tags: [Site Inspections]
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
 *         description: Site inspection not found
 */
router.post("/:id/reject", reject);

export default router;
