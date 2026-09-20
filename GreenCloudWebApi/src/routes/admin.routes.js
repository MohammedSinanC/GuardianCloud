import { Router } from "express";
import AdminController from "../controllers/admin.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

// Public
/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticates an admin and returns a JWT bearer token.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, format: password, example: secret123 }
 *     responses:
 *       200:
 *         description: Login successful — token + admin profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Login successful }
 *                 token: { type: string, example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... }
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id: { $ref: "#/components/schemas/MongoId" }
 *                     username: { type: string }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     profileImage: { type: string }
 *                     role: { type: string, example: admin }
 *       400:
 *         description: Username and password are required
 *         content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } }
 *       401:
 *         description: Invalid username or password
 *         content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } }
 *       403:
 *         description: Account is deactivated
 *         content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } }
 */
router.post("/login", AdminController.login);

// Protected
/**
 * @openapi
 * /api/admin/profile:
 *   get:
 *     summary: Get the logged-in admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile
 *       404:
 *         description: Admin not found
 *         content: { application/json: { schema: { $ref: "#/components/schemas/Error" } } }
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", adminAuth, AdminController.profile);

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     summary: Dashboard analytics
 *     description: Aggregated KPIs — monthly quotations, requests by status/location, conversion funnel and latest inquiries.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, thisWeek, thisMonth, lastMonth, thisYear]
 *           default: thisMonth
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Unauthorized
 */
router.get("/dashboard", adminAuth, AdminController.dashboard);

/**
 * @openapi
 * /api/admin/service-requests/{id}/schedule:
 *   put:
 *     summary: Reschedule a service request
 *     description: Updates preferred date/time and urgency of an inquiry. Blocked once the quotation is approved.
 *     tags: [Admin]
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
 *             required: [preferredDate, preferredTime]
 *             properties:
 *               preferredDate: { type: string, format: date, example: "2026-10-01" }
 *               preferredTime: { type: string, example: "10:00 AM" }
 *               urgency: { type: string, enum: [NORMAL, URGENT, EMERGENCY], example: NORMAL }
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       400:
 *         description: Missing or invalid schedule fields
 *       403:
 *         description: Schedule cannot be modified after quotation approval
 *       404:
 *         description: Service request not found
 */
router.put("/service-requests/:id/schedule", adminAuth, AdminController.updateSchedule);

export default router;
