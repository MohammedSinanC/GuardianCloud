import express from "express";
import workflowController from "../controllers/workflow.controller.js";
import workflowAdminController from "../controllers/workflow-admin.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/workflow/{entityType}/{entityId}/actions:
 *   get:
 *     summary: List available workflow actions for a document
 *     tags: [Workflow]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string, example: LEAD }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Actions available in the document's current stage
 *       404:
 *         description: Document or workflow not found
 */
router.get("/:entityType/:entityId/actions", workflowController.getActions);

/**
 * @openapi
 * /api/workflow/{entityType}/{entityId}/history:
 *   get:
 *     summary: Get workflow history for a document
 *     tags: [Workflow]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string, example: QUOTATION }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Chronological workflow history
 *       404:
 *         description: Document or workflow not found
 */
router.get("/:entityType/:entityId/history", workflowController.getHistory);

/**
 * @openapi
 * /api/workflow/execute:
 *   post:
 *     summary: Execute a workflow action
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityType, entityId, actionCode]
 *             properties:
 *               entityType: { type: string, example: LEAD }
 *               entityId: { $ref: "#/components/schemas/MongoId" }
 *               actionCode: { type: string, example: SUBMIT }
 *               remark: { type: string }
 *     responses:
 *       200:
 *         description: Action executed; document moved to the next stage
 *       400:
 *         description: Action not valid in current stage
 *       401:
 *         description: Unauthorized
 */
router.post("/execute", adminAuth, workflowController.executeAction);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}:
 *   get:
 *     summary: Get a workflow configuration
 *     tags: [Workflow]
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string, example: PEST_CONTROL }
 *     responses:
 *       200:
 *         description: Workflow stages and actions
 *       404:
 *         description: Workflow not found
 */
router.get("/config/:workflowCode", workflowAdminController.getConfig);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}/stages:
 *   post:
 *     summary: Add a stage to a workflow
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string, example: PEST_CONTROL }
 *     responses:
 *       201:
 *         description: Stage created
 *       400:
 *         description: Validation error
 */
router.post("/config/:workflowCode/stages", adminAuth, workflowAdminController.createStage);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}/stages/{stageId}:
 *   put:
 *     summary: Update a workflow stage
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Stage updated
 *       404:
 *         description: Stage not found
 */
router.put("/config/:workflowCode/stages/:stageId", adminAuth, workflowAdminController.updateStage);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}/stages/{stageId}:
 *   delete:
 *     summary: Delete a workflow stage
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Stage deleted
 *       404:
 *         description: Stage not found
 */
router.delete("/config/:workflowCode/stages/:stageId", adminAuth, workflowAdminController.deleteStage);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}/actions:
 *   post:
 *     summary: Add an action to a workflow
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string, example: PEST_CONTROL }
 *     responses:
 *       201:
 *         description: Action created
 *       400:
 *         description: Validation error
 */
router.post("/config/:workflowCode/actions", adminAuth, workflowAdminController.createAction);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}/actions/{actionId}:
 *   put:
 *     summary: Update a workflow action
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: actionId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Action updated
 *       404:
 *         description: Action not found
 */
router.put("/config/:workflowCode/actions/:actionId", adminAuth, workflowAdminController.updateAction);

/**
 * @openapi
 * /api/workflow/config/{workflowCode}/actions/{actionId}:
 *   delete:
 *     summary: Delete a workflow action
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowCode
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: actionId
 *         required: true
 *         schema: { $ref: "#/components/schemas/MongoId" }
 *     responses:
 *       200:
 *         description: Action deleted
 *       404:
 *         description: Action not found
 */
router.delete("/config/:workflowCode/actions/:actionId", adminAuth, workflowAdminController.deleteAction);

export default router;
