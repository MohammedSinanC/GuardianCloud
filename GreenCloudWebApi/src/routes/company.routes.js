import { Router } from "express";
import CompanyController from "../controllers/company.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/companies:
 *   get:
 *     summary: List companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company list
 *       401:
 *         description: Unauthorized
 */
router.get("/", CompanyController.list);

/**
 * @openapi
 * /api/companies/{id}:
 *   get:
 *     summary: Get a company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Company details
 *       404:
 *         description: Company not found
 */
router.get("/:id", CompanyController.getById);

/**
 * @openapi
 * /api/companies:
 *   post:
 *     summary: Create a company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: GreenCloud Pest Control }
 *               tagline: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               whatsapp: { type: string }
 *               address: { type: string }
 *               workingHours: { type: string }
 *               yearEstablished: { type: integer }
 *               code: { type: string }
 *               logo: { type: string }
 *               website: { type: string }
 *               taxNumber: { type: string }
 *               commercialRegistration: { type: string }
 *               vatPercentage: { type: number, example: 5 }
 *               currency: { type: string, example: AED }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Company created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", adminAuth, CompanyController.create);

/**
 * @openapi
 * /api/companies/{id}:
 *   put:
 *     summary: Update a company
 *     tags: [Companies]
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
 *               name: { type: string }
 *               tagline: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               address: { type: string }
 *               vatPercentage: { type: number }
 *               currency: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Company updated
 *       404:
 *         description: Company not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id", adminAuth, CompanyController.update);

export default router;
