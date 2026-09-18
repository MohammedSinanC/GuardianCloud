import express from "express";
import workflowController from "../controllers/workflow.controller.js";
import workflowAdminController from "../controllers/workflow-admin.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.get("/:entityType/:entityId/actions", workflowController.getActions);
router.get("/:entityType/:entityId/history", workflowController.getHistory);
router.post("/execute", adminAuth, workflowController.executeAction);
router.get("/config/:workflowCode", workflowAdminController.getConfig);
router.post("/config/:workflowCode/stages", adminAuth, workflowAdminController.createStage);
router.put("/config/:workflowCode/stages/:stageId", adminAuth, workflowAdminController.updateStage);
router.delete("/config/:workflowCode/stages/:stageId", adminAuth, workflowAdminController.deleteStage);
router.post("/config/:workflowCode/actions", adminAuth, workflowAdminController.createAction);
router.put("/config/:workflowCode/actions/:actionId", adminAuth, workflowAdminController.updateAction);
router.delete("/config/:workflowCode/actions/:actionId", adminAuth, workflowAdminController.deleteAction);

export default router;
