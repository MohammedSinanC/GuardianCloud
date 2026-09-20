import { Router } from "express";
import WebsiteContentController from "../controllers/website-content.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/content:
 *   get:
 *     summary: Get all website content
 *     description: Returns every content key/value pair used by the public website.
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: Content map keyed by content key
 */
router.get("/", WebsiteContentController.getAll);

/**
 * @openapi
 * /api/content/{key}:
 *   get:
 *     summary: Get a single content entry
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string, example: about_hero_title }
 *     responses:
 *       200:
 *         description: Content entry
 *       404:
 *         description: Content key not found
 */
router.get("/:key", WebsiteContentController.getByKey);

/**
 * @openapi
 * /api/content/{key}:
 *   put:
 *     summary: Update a content entry
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string, example: about_hero_title }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value: { type: string }
 *     responses:
 *       200:
 *         description: Content updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Content key not found
 */
router.put("/:key", adminAuth, WebsiteContentController.update);

/**
 * @openapi
 * /api/content/seed:
 *   post:
 *     summary: Seed default website content
 *     description: Creates any missing default content keys; existing values are left untouched.
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seed result summary
 *       401:
 *         description: Unauthorized
 */
router.post("/seed", adminAuth, WebsiteContentController.seedAll);

export default router;
