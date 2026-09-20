import express from "express";
import { list, getById, create, createPublic, update, remove, submit, reject, approve } from "../controllers/lead.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Public website submissions become leads pending admin approval.
/**
 * @openapi
 * /api/leads/public:
 *   post:
 *     summary: Public website contact submission
 *     description: Creates a lead from the public website contact form. No auth; always starts in DRAFT with source WEBSITE.
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, contactPerson, mobile, serviceRequired]
 *             properties:
 *               companyName: { type: string, example: Acme Facilities }
 *               contactPerson: { type: string, example: John Doe }
 *               mobile: { type: string, example: "+971501234567" }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               location: { type: string }
 *               serviceRequired: { type: string, example: Cockroach control }
 *               preferredDate: { type: string, format: date }
 *               preferredTime: { type: string, example: "10:00 AM" }
 *               description: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *       400:
 *         description: Missing mandatory fields or validation error
 */
router.post("/public", createPublic);

router.use(adminAuth);

/**
 * @openapi
 * /api/leads:
 *   get:
 *     summary: List leads
 *     tags: [Leads]
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
 *         schema: { type: string, description: Matches leadNo, company, contact, mobile, email }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, PENDING_APPROVAL, APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: Paginated lead list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/leads/{id}:
 *   get:
 *     summary: Get a lead by ID
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Lead details
 *       404:
 *         description: Lead not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/leads:
 *   post:
 *     summary: Create a lead
 *     description: Creates a DRAFT lead, or PENDING_APPROVAL when status is passed (mandatory fields validated).
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName: { type: string }
 *               contactPerson: { type: string }
 *               mobile: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               location: { type: string }
 *               source: { type: string, example: PHONE }
 *               serviceRequired: { type: string }
 *               preferredDate: { type: string, format: date }
 *               preferredTime: { type: string }
 *               description: { type: string }
 *               notes: { type: string }
 *               status: { type: string, enum: [DRAFT, PENDING_APPROVAL], default: DRAFT }
 *     responses:
 *       201:
 *         description: Lead created
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/leads/{id}/submit:
 *   post:
 *     summary: Submit a DRAFT lead for approval
 *     description: Transitions DRAFT → PENDING_APPROVAL after validating mandatory fields.
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Lead submitted for approval
 *       400:
 *         description: Invalid status or missing mandatory fields
 *       404:
 *         description: Lead not found
 */
router.post("/:id/submit", submit);

/**
 * @openapi
 * /api/leads/{id}/approve:
 *   post:
 *     summary: Approve a lead — the ERP transaction
 *     description: >
 *       In one transaction: finds-or-creates the Customer, creates/reuses the customer
 *       login user, creates/reuses the Account Ledger, creates the Inquiry, and stamps
 *       the lead APPROVED. Idempotent — approving an already-approved lead returns the
 *       existing chain.
 *     tags: [Leads]
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
 *               customerId:
 *                 type: string
 *                 description: Optional existing customer to link instead of find-or-create
 *                 schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Lead approved; returns customer, user, ledger and inquiry references
 *       400:
 *         description: Invalid status or missing mandatory fields
 *       404:
 *         description: Lead or selected customer not found
 *       500:
 *         description: Transaction failure
 */
router.post("/:id/approve", approve);

/**
 * @openapi
 * /api/leads/{id}/reject:
 *   post:
 *     summary: Reject a lead
 *     description: Requires a rejection reason.
 *     tags: [Leads]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: Duplicate of existing customer }
 *     responses:
 *       200:
 *         description: Lead rejected
 *       400:
 *         description: Invalid status or missing reason
 *       404:
 *         description: Lead not found
 */
router.post("/:id/reject", reject);

/**
 * @openapi
 * /api/leads/{id}:
 *   put:
 *     summary: Update a lead
 *     description: Editable only in DRAFT, PENDING_APPROVAL or REJECTED. Pass resubmit:true on a rejected lead to send it back for approval.
 *     tags: [Leads]
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
 *               companyName: { type: string }
 *               contactPerson: { type: string }
 *               mobile: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               location: { type: string }
 *               serviceRequired: { type: string }
 *               description: { type: string }
 *               notes: { type: string }
 *               customerId: { $ref: "#/components/schemas/MongoId" }
 *               status: { type: string, enum: [DRAFT, PENDING_APPROVAL, REJECTED] }
 *               resubmit: { type: boolean, description: Set true to resubmit a REJECTED lead }
 *     responses:
 *       200:
 *         description: Lead updated (or resubmitted)
 *       400:
 *         description: Lead not editable in current status
 *       404:
 *         description: Lead not found
 */
router.put("/:id", update);

/**
 * @openapi
 * /api/leads/{id}:
 *   delete:
 *     summary: Delete a lead
 *     description: Only DRAFT leads can be deleted.
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Lead deleted
 *       400:
 *         description: Only DRAFT leads can be deleted
 *       404:
 *         description: Lead not found
 */
router.delete("/:id", remove);

export default router;
