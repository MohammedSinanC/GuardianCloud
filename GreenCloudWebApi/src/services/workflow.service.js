import {
  Workflow,
  WorkflowStage,
  WorkflowAction,
  WorkflowHistory,
} from "../models/workflow.model.js";
import Inspection from "../models/inspection.model.js";
import Quotation from "../models/quotation.model.js";
import ServiceJob from "../models/servicejob.model.js";
import Invoice from "../models/invoice.model.js";

/**
 * Generic Workflow Engine
 * 
 * All workflow configuration comes from MongoDB.
 * This engine contains ZERO workflow-specific logic.
 * It works with any workflow code: PEST_CONTROL, HSE, MAINTENANCE, etc.
 */
class WorkflowEngine {
  /**
   * Get workflow configuration
   */
  async getWorkflow(workflowCode) {
    const workflow = await Workflow.findOne({
      workflowCode,
      isActive: true,
    });
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowCode}`);
    }
    return workflow;
  }

  /**
   * Get all stages for a workflow, sorted by sequence
   */
  async getStages(workflowCode) {
    return WorkflowStage.find({
      workflowCode,
      isActive: true,
    }).sort({ sequence: 1 });
  }

  /**
   * Get the current stage document for an entity
   */
  async getCurrentStage(workflowCode, currentStageCode) {
    const stage = await WorkflowStage.findOne({
      workflowCode,
      stageCode: currentStageCode,
      isActive: true,
    });
    if (!stage) {
      throw new Error(`Workflow stage not configured: ${currentStageCode}`);
    }
    return stage;
  }

  /**
   * Get the initial stage for a workflow
   */
  async getInitialStage(workflowCode) {
    const stage = await WorkflowStage.findOne({
      workflowCode,
      isInitial: true,
      isActive: true,
    });
    if (!stage) {
      throw new Error(`Initial stage not configured for workflow: ${workflowCode}`);
    }
    return stage;
  }

  /**
   * Get available actions for a given stage, filtered by user role
   */
  async getAvailableActions(workflowCode, stageCode, userRole) {
    const query = {
      workflowCode,
      stageCode,
      isActive: true,
    };

    let actions = await WorkflowAction.find(query).sort({
      displayOrder: 1,
    });

    // Filter by user role if role is provided
    if (userRole && userRole.length > 0) {
      actions = actions.filter((action) => {
        // If allowedRoles is empty, action is available to all
        if (!action.allowedRoles || action.allowedRoles.length === 0) {
          return true;
        }
        // Check if user role is in allowedRoles
        return action.allowedRoles.some((role) =>
          userRole.toUpperCase().includes(role.toUpperCase())
        );
      });
    }

    return actions.map((action) => ({
      id: action._id,
      code: action.actionCode,
      name: action.actionName,
      nextStageCode: action.nextStageCode,
      rejectStageCode: action.rejectStageCode,
      buttonColor: action.buttonColor,
      requiresComment: action.requiresComment,
      requiresAttachment: action.requiresAttachment,
      mailRequired: action.mailRequired,
      mailRecipients: action.mailRecipients,
    }));
  }

  /**
   * Validate that an action is available for the current stage
   */
  async validateAction(workflowCode, currentStageCode, actionId) {
    const action = await WorkflowAction.findOne({
      _id: actionId,
      workflowCode,
      stageCode: currentStageCode,
      isActive: true,
    });

    if (!action) {
      throw new Error(
        "The selected workflow action is not available for the current stage."
      );
    }

    return action;
  }

  /**
   * Execute a workflow action
   * 1. Validate action
   * 2. Get next stage from DB
   * 3. Update entity
   * 4. Create history
   * Returns: { previousStage, currentStage }
   */
  async executeAction({
    workflowCode,
    entityType,
    entityId,
    actionId,
    comment,
    user,
    ipAddress,
    // Business hook callback
    onBeforeUpdate,
    onAfterUpdate,
  }) {
    // 1. Get current entity to find current stage
    const entityModel = this._getEntityModel(entityType);
    const entity = await entityModel.findById(entityId);
    if (!entity) {
      throw new Error(`${entityType} not found`);
    }

    const currentStageCode = entity.currentStageCode;

    // 2. Validate action belongs to current stage
    const action = await this.validateAction(
      workflowCode,
      currentStageCode,
      actionId
    );

    // 3. Determine next stage
    let nextStageCode;
    if (action.rejectStageCode) {
      // If action has a reject path and comment contains "reject", use reject stage
      // This is flexible - the frontend can indicate reject via action selection
      nextStageCode = action.rejectStageCode;
    } else {
      nextStageCode = action.nextStageCode;
    }

    // If nextStageCode is null/empty, this is a terminal action
    if (!nextStageCode) {
      throw new Error("No next stage configured for this action.");
    }

    // Validate next stage exists
    const nextStage = await WorkflowStage.findOne({
      workflowCode,
      stageCode: nextStageCode,
      isActive: true,
    });
    if (!nextStage) {
      throw new Error(`Next stage not configured: ${nextStageCode}`);
    }

    // 4. Before-update hook (business logic)
    if (onBeforeUpdate) {
      await onBeforeUpdate(entity, action);
    }

    // 5. Update entity stage
    entity.currentStageCode = nextStageCode;
    if (nextStage.stageType === "terminal" || nextStage.isFinal) {
      entity.status = "completed";
    } else if (nextStage.stageType === "reject") {
      entity.status = "rejected";
    } else if (nextStage.stageType === "hold") {
      entity.status = "on_hold";
    }
    entity.updatedBy = user?.id || null;
    entity.updatedByName = user?.username || "system";
    await entity.save();

    // 6. After-update hook (business logic)
    if (onAfterUpdate) {
      await onAfterUpdate(entity, action, nextStageCode);
    }

    // 7. Create workflow history
    const history = await WorkflowHistory.create({
      workflowCode,
      entityType,
      entityId: entity._id,
      fromStageCode: currentStageCode,
      toStageCode: nextStageCode,
      actionCode: action.actionCode,
      actionName: action.actionName,
      performedBy: user?.id || null,
      performedByName: user?.username || "system",
      performedByRole: user?.role || "",
      comment: comment || "",
      ipAddress: ipAddress || "",
    });

    // 8. Process notifications (fire-and-forget, don't block workflow)
    if (action.mailRequired) {
      this._processMailNotification(action, entity, currentStageCode, nextStageCode).catch(
        (err) => console.error("Mail notification error:", err)
      );
    }

    return {
      previousStage: currentStageCode,
      currentStage: nextStageCode,
      actionCode: action.actionCode,
      historyId: history._id,
    };
  }

  /**
   * Get workflow history for an entity
   */
  async getHistory(entityType, entityId) {
    return WorkflowHistory.find({
      entityType,
      entityId,
    }).sort({ createdAt: 1 });
  }

  /**
   * Process mail notification (placeholder for actual email sending)
   */
  async _processMailNotification(action, entity, fromStage, toStage) {
    // This is a placeholder. In production, integrate with a mail service.
    console.log(
      `[MAIL] Action: ${action.actionCode}, Entity: ${entity._id}, ` +
      `From: ${fromStage} -> To: ${toStage}, Recipients: ${action.mailRecipients}`
    );
  }

  /**
   * Get entity model by type string
   */
  _getEntityModel(entityType) {
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
}

export default new WorkflowEngine();
