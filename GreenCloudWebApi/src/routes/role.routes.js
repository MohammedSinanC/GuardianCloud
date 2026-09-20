import { Router } from 'express';
import RoleController from '../controllers/role.controller.js';
import adminAuth from '../middleware/admin-auth.middleware.js';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     PermissionItem:
 *       type: object
 *       properties:
 *         page: { type: string, example: quotations }
 *         visible: { type: boolean }
 *         view: { type: boolean }
 *         create: { type: boolean }
 *         edit: { type: boolean }
 *         delete: { type: boolean }
 */

/**
 * @openapi
 * /api/roles:
 *   get:
 *     summary: List roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role list
 *       401:
 *         description: Unauthorized
 */
router.get('/', adminAuth, RoleController.list);

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Role details
 *       404:
 *         description: Role not found
 */
router.get('/:id', adminAuth, RoleController.getById);

/**
 * @openapi
 * /api/roles:
 *   post:
 *     summary: Create a role
 *     tags: [Roles]
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
 *               name: { type: string, example: Supervisor }
 *               description: { type: string }
 *               permissions:
 *                 type: array
 *                 items: { $ref: "#/components/schemas/PermissionItem" }
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         description: Validation error
 */
router.post('/', adminAuth, RoleController.create);

/**
 * @openapi
 * /api/roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
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
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Role updated
 *       404:
 *         description: Role not found
 */
router.put('/:id', adminAuth, RoleController.update);

/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Role deleted
 *       404:
 *         description: Role not found
 */
router.delete('/:id', adminAuth, RoleController.delete);

/**
 * @openapi
 * /api/roles/{id}/permissions:
 *   put:
 *     summary: Replace a role's permissions
 *     tags: [Roles]
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
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items: { $ref: "#/components/schemas/PermissionItem" }
 *     responses:
 *       200:
 *         description: Permissions updated
 *       404:
 *         description: Role not found
 */
router.put('/:id/permissions', adminAuth, RoleController.updatePermissions);

export default router;
