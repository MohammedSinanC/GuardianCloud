import { Router } from "express";
import UserController from "../controllers/user.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";
import { checkPermission, checkCompanyAccess } from "../middleware/permission.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated user list
 *       401:
 *         description: Unauthorized
 */
router.get("/", adminAuth, checkCompanyAccess, UserController.list);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/:id", adminAuth, checkCompanyAccess, UserController.getById);

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               mobile: { type: string }
 *               password: { type: string, format: password }
 *               role: { type: string, example: admin }
 *               companyId: { $ref: "#/components/schemas/MongoId" }
 *               roleId: { $ref: "#/components/schemas/MongoId" }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
router.post("/", adminAuth, checkCompanyAccess, UserController.create);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
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
 *               email: { type: string, format: email }
 *               mobile: { type: string }
 *               password: { type: string, format: password, description: Optional new password }
 *               role: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.put("/:id", adminAuth, checkCompanyAccess, UserController.update);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete("/:id", adminAuth, checkCompanyAccess, UserController.delete);

export default router;
