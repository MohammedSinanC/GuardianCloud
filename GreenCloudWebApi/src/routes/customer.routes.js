import express from "express";
import { list, getById, create, update, remove } from "../controllers/customer.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     summary: List customers
 *     tags: [Customers]
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
 *     responses:
 *       200:
 *         description: Paginated customer list
 *       401:
 *         description: Unauthorized
 */
router.get("/", list);

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     summary: Get a customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /api/customers:
 *   post:
 *     summary: Create a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, contactPerson, mobile]
 *             properties:
 *               companyName: { type: string, example: Acme Facilities }
 *               contactPerson: { type: string }
 *               mobile: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               location: { type: string }
 *               customerType: { type: string, example: COMPANY }
 *     responses:
 *       201:
 *         description: Customer created
 *       400:
 *         description: Validation error
 */
router.post("/", create);

/**
 * @openapi
 * /api/customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Customer updated
 *       404:
 *         description: Customer not found
 */
router.put("/:id", update);

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Customer deleted
 *       404:
 *         description: Customer not found
 */
router.delete("/:id", remove);

export default router;
