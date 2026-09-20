import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated admin
 *     description: Returns the profile of the admin identified by the bearer token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current admin session
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 */
router.get("/me", adminAuth, AuthController.me);

export default router;
