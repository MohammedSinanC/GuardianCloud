import { Workflow, WorkflowStage, WorkflowAction } from "../models/workflow.model.js";

const workflowAdminController = {
  /**
   * GET /api/workflow/config/:workflowCode
   * Get full workflow config with stages and actions
   */
  async getConfig(req, res) {
    try {
      const { workflowCode } = req.params;

      const workflow = await Workflow.findOne({ workflowCode, isActive: true });
      if (!workflow) {
        return res.status(404).json({ success: false, message: "Workflow not found" });
      }

      const stages = await WorkflowStage.find({ workflowCode, isActive: true }).sort({ sequence: 1 });
      const actions = await WorkflowAction.find({ workflowCode, isActive: true }).sort({ stageCode: 1, displayOrder: 1 });

      const stagesWithActions = stages.map((stage) => ({
        ...stage.toObject(),
        actions: actions.filter((a) => a.stageCode === stage.stageCode),
      }));

      return res.status(200).json({
        success: true,
        data: { workflow, stages: stagesWithActions },
      });
    } catch (error) {
      console.error("Get workflow config error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/workflow/config/:workflowCode/stages
   * Create a new stage
   */
  async createStage(req, res) {
    try {
      const { workflowCode } = req.params;
      const { stageCode, stageName, stageType, isInitial, isFinal, description } = req.body;

      if (!stageCode || !stageName) {
        return res.status(400).json({ success: false, message: "stageCode and stageName are required" });
      }

      // Get next sequence number
      const lastStage = await WorkflowStage.findOne({ workflowCode }).sort({ sequence: -1 });
      const sequence = (lastStage?.sequence || 0) + 1;

      const stage = await WorkflowStage.findOneAndUpdate(
        { workflowCode, stageCode },
        {
          workflowCode,
          stageCode: stageCode.toUpperCase().replace(/\s+/g, '_'),
          stageName,
          stageType: stageType || "normal",
          isInitial: isInitial || false,
          isFinal: isFinal || false,
          description: description || "",
          sequence,
          isActive: true,
          createdBy: req.admin?.username || "system",
          updatedBy: req.admin?.username || "system",
        },
        { upsert: true, new: true }
      );

      return res.status(201).json({ success: true, data: stage });
    } catch (error) {
      console.error("Create stage error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PUT /api/workflow/config/:workflowCode/stages/:stageId
   * Update a stage
   */
  async updateStage(req, res) {
    try {
      const { stageId } = req.params;
      const updates = req.body;

      // Remove immutable fields
      delete updates.workflowCode;
      delete updates.stageCode;
      delete updates.createdBy;

      updates.updatedBy = req.admin?.username || "system";

      const stage = await WorkflowStage.findByIdAndUpdate(stageId, updates, { new: true });
      if (!stage) {
        return res.status(404).json({ success: false, message: "Stage not found" });
      }

      return res.status(200).json({ success: true, data: stage });
    } catch (error) {
      console.error("Update stage error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * DELETE /api/workflow/config/:workflowCode/stages/:stageId
   * Soft-delete a stage
   */
  async deleteStage(req, res) {
    try {
      const { stageId } = req.params;

      const stage = await WorkflowStage.findByIdAndUpdate(
        stageId,
        { isActive: false, updatedBy: req.admin?.username || "system" },
        { new: true }
      );
      if (!stage) {
        return res.status(404).json({ success: false, message: "Stage not found" });
      }

      // Also deactivate actions for this stage
      await WorkflowAction.updateMany(
        { workflowCode: stage.workflowCode, stageCode: stage.stageCode },
        { isActive: false }
      );

      return res.status(200).json({ success: true, message: "Stage deleted" });
    } catch (error) {
      console.error("Delete stage error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/workflow/config/:workflowCode/actions
   * Create a new action/transition
   */
  async createAction(req, res) {
    try {
      const { workflowCode } = req.params;
      const {
        stageCode, actionCode, actionName, nextStageCode, rejectStageCode,
        buttonColor, allowedRoles, requiresComment, requiresAttachment,
        mailRequired, mailRecipients, mailSubjectTemplate, mailBodyTemplate,
      } = req.body;

      if (!stageCode || !actionCode || !actionName) {
        return res.status(400).json({ success: false, message: "stageCode, actionCode, and actionName are required" });
      }

      // Get next display order
      const lastAction = await WorkflowAction.findOne({ workflowCode, stageCode }).sort({ displayOrder: -1 });
      const displayOrder = (lastAction?.displayOrder || 0) + 1;

      const action = await WorkflowAction.findOneAndUpdate(
        { workflowCode, stageCode, actionCode },
        {
          workflowCode,
          stageCode,
          actionCode: actionCode.toUpperCase().replace(/\s+/g, '_'),
          actionName,
          nextStageCode: nextStageCode || null,
          rejectStageCode: rejectStageCode || null,
          buttonColor: buttonColor || "primary",
          allowedRoles: allowedRoles || [],
          requiresComment: requiresComment || false,
          requiresAttachment: requiresAttachment || false,
          mailRequired: mailRequired || false,
          mailRecipients: mailRecipients || "",
          mailSubjectTemplate: mailSubjectTemplate || "",
          mailBodyTemplate: mailBodyTemplate || "",
          displayOrder,
          isActive: true,
          createdBy: req.admin?.username || "system",
          updatedBy: req.admin?.username || "system",
        },
        { upsert: true, new: true }
      );

      return res.status(201).json({ success: true, data: action });
    } catch (error) {
      console.error("Create action error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PUT /api/workflow/config/:workflowCode/actions/:actionId
   * Update an action
   */
  async updateAction(req, res) {
    try {
      const { actionId } = req.params;
      const updates = req.body;

      delete updates.workflowCode;
      delete updates.stageCode;
      delete updates.actionCode;
      delete updates.createdBy;

      updates.updatedBy = req.admin?.username || "system";

      const action = await WorkflowAction.findByIdAndUpdate(actionId, updates, { new: true });
      if (!action) {
        return res.status(404).json({ success: false, message: "Action not found" });
      }

      return res.status(200).json({ success: true, data: action });
    } catch (error) {
      console.error("Update action error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * DELETE /api/workflow/config/:workflowCode/actions/:actionId
   * Soft-delete an action
   */
  async deleteAction(req, res) {
    try {
      const { actionId } = req.params;

      const action = await WorkflowAction.findByIdAndUpdate(
        actionId,
        { isActive: false, updatedBy: req.admin?.username || "system" },
        { new: true }
      );
      if (!action) {
        return res.status(404).json({ success: false, message: "Action not found" });
      }

      return res.status(200).json({ success: true, message: "Action deleted" });
    } catch (error) {
      console.error("Delete action error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default workflowAdminController;
