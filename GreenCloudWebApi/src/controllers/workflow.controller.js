import WorkflowEngine from "../services/workflow.service.js";
import { Workflow, WorkflowStage, WorkflowAction, WorkflowHistory } from "../models/workflow.model.js";
import Inspection from "../models/inspection.model.js";
import Quotation from "../models/quotation.model.js";
import ServiceJob from "../models/servicejob.model.js";
import Invoice from "../models/invoice.model.js";

/**
 * Generic Workflow Controller
 * All operations read from MongoDB configuration
 */
const workflowController = {
  /**
   * GET /api/workflow/:entityType/:entityId/actions
   * Get available actions for an entity
   */
  async getActions(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const userRole = req.admin?.role || req.user?.role || "";

      // Find the entity to get its current stage
      const entityModel = _getEntityModel(entityType);
      const entity = await entityModel.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: `${entityType} not found`,
        });
      }

      const workflowCode = entity.workflowCode;
      const currentStageCode = entity.currentStageCode;

      // Get stage info
      const stage = await WorkflowEngine.getCurrentStage(
        workflowCode,
        currentStageCode
      );

      // Get available actions
      const actions = await WorkflowEngine.getAvailableActions(
        workflowCode,
        currentStageCode,
        userRole
      );

      return res.status(200).json({
        success: true,
        data: {
          entityId: entity._id,
          currentStage: {
            code: stage.stageCode,
            name: stage.stageName,
            type: stage.stageType,
          },
          actions,
        },
      });
    } catch (error) {
      console.error("Get workflow actions error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get workflow actions",
      });
    }
  },

  /**
   * POST /api/workflow/execute
   * Execute a workflow action
   */
  async executeAction(req, res) {
    try {
      const { entityType, entityId, actionCode, comment, rejectStage } = req.body;

      if (!entityType || !entityId || !actionCode) {
        return res.status(400).json({
          success: false,
          message: "entityType, entityId, and actionCode are required",
        });
      }

      // Find the entity
      const entityModel = _getEntityModel(entityType);
      const entity = await entityModel.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: `${entityType} not found`,
        });
      }

      const workflowCode = entity.workflowCode;
      const currentStageCode = entity.currentStageCode;

      // Find the action by actionCode for the current stage
      const action = await WorkflowAction.findOne({
        workflowCode,
        stageCode: currentStageCode,
        actionCode,
        isActive: true,
      });

      if (!action) {
        return res.status(400).json({
          success: false,
          message: `Action '${actionCode}' is not available for stage '${currentStageCode}'`,
        });
      }

      // Check role permission
      const userRole = req.admin?.role || req.user?.role || "";
      if (action.allowedRoles && action.allowedRoles.length > 0) {
        const hasPermission = action.allowedRoles.some((role) =>
          userRole.toUpperCase().includes(role.toUpperCase())
        );
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: "You do not have permission to perform this action",
          });
        }
      }

      // Determine next stage - use rejectStage if provided and action has reject path
      let nextStageCode;
      if (rejectStage && action.rejectStageCode) {
        nextStageCode = action.rejectStageCode;
      } else {
        nextStageCode = action.nextStageCode;
      }

      if (!nextStageCode) {
        return res.status(400).json({
          success: false,
          message: "No next stage configured for this action",
        });
      }

      // Validate next stage exists
      const nextStage = await WorkflowStage.findOne({
        workflowCode,
        stageCode: nextStageCode,
        isActive: true,
      });
      if (!nextStage) {
        return res.status(400).json({
          success: false,
          message: `Next stage not configured: ${nextStageCode}`,
        });
      }

      const previousStageCode = entity.currentStageCode;

      // Update entity
      entity.currentStageCode = nextStageCode;
      if (nextStage.stageType === "terminal" || nextStage.isFinal) {
        entity.status = "completed";
      } else if (nextStage.stageType === "reject") {
        entity.status = "rejected";
      }
      entity.updatedBy = req.admin?._id || req.user?._id || null;
      entity.updatedByName = req.admin?.username || req.user?.username || "system";
      await entity.save();

      // Create workflow history
      await WorkflowHistory.create({
        workflowCode,
        entityType,
        entityId: entity._id,
        fromStageCode: previousStageCode,
        toStageCode: nextStageCode,
        actionCode: action.actionCode,
        actionName: action.actionName,
        performedBy: req.admin?._id || req.user?._id || null,
        performedByName: req.admin?.username || req.user?.username || "system",
        performedByRole: userRole,
        comment: comment || "",
        ipAddress: req.ip || "",
      });

      return res.status(200).json({
        success: true,
        message: "Action executed successfully",
        data: {
          entityId: entity._id,
          previousStage: previousStageCode,
          currentStage: nextStageCode,
          actionCode: action.actionCode,
        },
      });
    } catch (error) {
      console.error("Execute workflow action error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to execute workflow action",
      });
    }
  },

  /**
   * GET /api/workflow/:entityType/:entityId/history
   * Get workflow history for an entity
   */
  async getHistory(req, res) {
    try {
      const { entityType, entityId } = req.params;

      const history = await WorkflowEngine.getHistory(entityType, entityId);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error("Get workflow history error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get workflow history",
      });
    }
  },

  /**
   * GET /api/workflow/config/:workflowCode
   * Get complete workflow configuration (for admin management)
   */
  async getWorkflowConfig(req, res) {
    try {
      const { workflowCode } = req.params;

      const workflow = await Workflow.findOne({
        workflowCode,
        isActive: true,
      });
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: "Workflow not found",
        });
      }

      const stages = await WorkflowEngine.getStages(workflowCode);
      const actions = await WorkflowAction.find({
        workflowCode,
        isActive: true,
      }).sort({ stageCode: 1, displayOrder: 1 });

      // Group actions by stage
      const stagesWithActions = stages.map((stage) => ({
        ...stage.toObject(),
        actions: actions.filter((a) => a.stageCode === stage.stageCode),
      }));

      return res.status(200).json({
        success: true,
        data: {
          workflow,
          stages: stagesWithActions,
        },
      });
    } catch (error) {
      console.error("Get workflow config error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get workflow configuration",
      });
    }
  },
};

/**
 * Get entity model by type
 */
function _getEntityModel(entityType) {
  const models = {
    INSPECTION: Inspection,
    QUOTATION: Quotation,
    SERVICE_JOB: ServiceJob,
    INVOICE: Invoice,
  };
  const model = models[entityType];
  if (!model) throw new Error(`Unknown entity type: ${entityType}`);
  return model;
}

export default workflowController;
