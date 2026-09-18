import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  Workflow,
  WorkflowStage,
  WorkflowAction,
  WorkflowActionMail,
} from "../src/models/workflow.model.js";

dotenv.config();

const seedWorkflow = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if workflow already exists
    const existing = await Workflow.findOne({ workflowCode: "SERVICE_REQUEST" });
    if (existing) {
      console.log("Service Request workflow already exists. Skipping seed.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // 1. Create Workflow
    const workflow = await Workflow.create({
      workflowCode: "SERVICE_REQUEST",
      workflowName: "Service Request Workflow",
      moduleCode: "SERVICE_REQUEST",
      initialStageCode: "CREATED",
      active: true,
    });
    console.log("Workflow created:", workflow._id);

    // 2. Create Stages
    const stagesData = [
      { stageCode: "CREATED", stageName: "Created", stageOrder: 1, stageType: "normal" },
      { stageCode: "APPROVED", stageName: "Approved", stageOrder: 2, stageType: "normal" },
      { stageCode: "QUOTATION", stageName: "Quotation", stageOrder: 3, stageType: "normal" },
      { stageCode: "INSPECTION", stageName: "Inspection", stageOrder: 4, stageType: "normal" },
      { stageCode: "WORK_STARTED", stageName: "Work Started", stageOrder: 5, stageType: "normal" },
      { stageCode: "COMPLETED", stageName: "Completed", stageOrder: 6, stageType: "normal" },
      { stageCode: "CLOSED", stageName: "Closed", stageOrder: 7, stageType: "terminal" },
      { stageCode: "REJECTED", stageName: "Rejected", stageOrder: 8, stageType: "reject" },
      { stageCode: "QUOTATION_REJECTED", stageName: "Quotation Rejected", stageOrder: 9, stageType: "reject" },
      { stageCode: "INSPECTION_FAILED", stageName: "Inspection Failed", stageOrder: 10, stageType: "reject" },
      { stageCode: "ON_HOLD", stageName: "On Hold", stageOrder: 11, stageType: "normal" },
      { stageCode: "CANCELLED", stageName: "Cancelled", stageOrder: 12, stageType: "terminal" },
    ];

    const stages = {};
    for (const s of stagesData) {
      const stage = await WorkflowStage.create({
        workflowId: workflow._id,
        ...s,
      });
      stages[s.stageCode] = stage;
      console.log(`  Stage: ${s.stageCode} → ${stage._id}`);
    }

    // 3. Create Actions
    const actionsData = [
      // CREATED stage
      { actionCode: "SAVE_AS_DRAFT", actionName: "Save as Draft", buttonColor: "secondary", currentStage: "CREATED", nextStage: "CREATED", rejectStage: null, mailRequired: false, displayOrder: 1 },
      { actionCode: "SUBMIT", actionName: "Submit", buttonColor: "primary", currentStage: "CREATED", nextStage: "APPROVED", rejectStage: null, mailRequired: true, displayOrder: 2 },
      { actionCode: "CANCEL", actionName: "Cancel", buttonColor: "danger", currentStage: "CREATED", nextStage: "CANCELLED", rejectStage: null, mailRequired: true, displayOrder: 3 },

      // APPROVED stage
      { actionCode: "APPROVE", actionName: "Approve", buttonColor: "success", currentStage: "APPROVED", nextStage: "QUOTATION", rejectStage: "REJECTED", mailRequired: true, displayOrder: 1 },
      { actionCode: "REJECT", actionName: "Reject", buttonColor: "danger", currentStage: "APPROVED", nextStage: null, rejectStage: "REJECTED", mailRequired: true, displayOrder: 2 },

      // QUOTATION stage
      { actionCode: "CREATE_QUOTATION", actionName: "Create Quotation", buttonColor: "primary", currentStage: "QUOTATION", nextStage: "QUOTATION", rejectStage: null, mailRequired: false, displayOrder: 1 },
      { actionCode: "SEND_QUOTATION", actionName: "Send Quotation", buttonColor: "info", currentStage: "QUOTATION", nextStage: "QUOTATION", rejectStage: null, mailRequired: true, displayOrder: 2 },
      { actionCode: "APPROVE_QUOTATION", actionName: "Approve Quotation", buttonColor: "success", currentStage: "QUOTATION", nextStage: "INSPECTION", rejectStage: "QUOTATION_REJECTED", mailRequired: true, displayOrder: 3 },
      { actionCode: "REJECT_QUOTATION", actionName: "Reject Quotation", buttonColor: "danger", currentStage: "QUOTATION", nextStage: null, rejectStage: "QUOTATION_REJECTED", mailRequired: true, displayOrder: 4 },

      // INSPECTION stage
      { actionCode: "SCHEDULE_INSPECTION", actionName: "Schedule Inspection", buttonColor: "primary", currentStage: "INSPECTION", nextStage: "INSPECTION", rejectStage: null, mailRequired: true, displayOrder: 1 },
      { actionCode: "START_INSPECTION", actionName: "Start Inspection", buttonColor: "info", currentStage: "INSPECTION", nextStage: "INSPECTION", rejectStage: null, mailRequired: false, displayOrder: 2 },
      { actionCode: "COMPLETE_INSPECTION", actionName: "Complete Inspection", buttonColor: "success", currentStage: "INSPECTION", nextStage: "WORK_STARTED", rejectStage: "INSPECTION_FAILED", mailRequired: true, displayOrder: 3 },
      { actionCode: "FAIL_INSPECTION", actionName: "Fail Inspection", buttonColor: "danger", currentStage: "INSPECTION", nextStage: null, rejectStage: "INSPECTION_FAILED", mailRequired: true, displayOrder: 4 },

      // WORK_STARTED stage
      { actionCode: "START_WORK", actionName: "Start Work", buttonColor: "primary", currentStage: "WORK_STARTED", nextStage: "WORK_STARTED", rejectStage: null, mailRequired: true, displayOrder: 1 },
      { actionCode: "UPDATE_WORK", actionName: "Update Work", buttonColor: "info", currentStage: "WORK_STARTED", nextStage: "WORK_STARTED", rejectStage: null, mailRequired: false, displayOrder: 2 },
      { actionCode: "UPLOAD_DOCUMENT", actionName: "Upload Document", buttonColor: "secondary", currentStage: "WORK_STARTED", nextStage: "WORK_STARTED", rejectStage: null, mailRequired: false, displayOrder: 3 },
      { actionCode: "COMPLETE_WORK", actionName: "Complete Work", buttonColor: "success", currentStage: "WORK_STARTED", nextStage: "COMPLETED", rejectStage: null, mailRequired: true, displayOrder: 4 },
      { actionCode: "PUT_ON_HOLD", actionName: "Put on Hold", buttonColor: "warning", currentStage: "WORK_STARTED", nextStage: "ON_HOLD", rejectStage: null, mailRequired: true, displayOrder: 5 },

      // COMPLETED stage
      { actionCode: "UPLOAD_COMPLETION_REPORT", actionName: "Upload Completion Report", buttonColor: "info", currentStage: "COMPLETED", nextStage: "COMPLETED", rejectStage: null, mailRequired: false, displayOrder: 1 },
      { actionCode: "CLOSE_REQUEST", actionName: "Close Request", buttonColor: "success", currentStage: "COMPLETED", nextStage: "CLOSED", rejectStage: null, mailRequired: true, displayOrder: 2 },

      // REJECTED stage
      { actionCode: "REOPEN", actionName: "Reopen", buttonColor: "warning", currentStage: "REJECTED", nextStage: "CREATED", rejectStage: null, mailRequired: true, displayOrder: 1 },

      // QUOTATION_REJECTED stage
      { actionCode: "RECREATE_QUOTATION", actionName: "Create New Quotation", buttonColor: "warning", currentStage: "QUOTATION_REJECTED", nextStage: "QUOTATION", rejectStage: null, mailRequired: true, displayOrder: 1 },

      // INSPECTION_FAILED stage
      { actionCode: "RESCHEDULE_INSPECTION", actionName: "Reschedule Inspection", buttonColor: "warning", currentStage: "INSPECTION_FAILED", nextStage: "INSPECTION", rejectStage: null, mailRequired: true, displayOrder: 1 },

      // ON_HOLD stage
      { actionCode: "RESUME_WORK", actionName: "Resume Work", buttonColor: "primary", currentStage: "ON_HOLD", nextStage: "WORK_STARTED", rejectStage: null, mailRequired: true, displayOrder: 1 },
      { actionCode: "CANCEL_FROM_HOLD", actionName: "Cancel", buttonColor: "danger", currentStage: "ON_HOLD", nextStage: "CANCELLED", rejectStage: null, mailRequired: true, displayOrder: 2 },

      // CANCELLED stage
      { actionCode: "REOPEN_CANCELLED", actionName: "Reopen Request", buttonColor: "warning", currentStage: "CANCELLED", nextStage: "CREATED", rejectStage: null, mailRequired: true, displayOrder: 1 },
    ];

    const actions = {};
    for (const a of actionsData) {
      const action = await WorkflowAction.create({
        workflowId: workflow._id,
        actionCode: a.actionCode,
        actionName: a.actionName,
        buttonColor: a.buttonColor,
        currentStageId: stages[a.currentStage]._id,
        nextStageId: a.nextStage ? stages[a.nextStage]._id : null,
        rejectStageId: a.rejectStage ? stages[a.rejectStage]._id : null,
        mailRequired: a.mailRequired,
        displayOrder: a.displayOrder,
      });
      actions[a.actionCode] = action;
      console.log(`  Action: ${a.actionCode} → ${action._id}`);
    }

    // 4. Create Mail Configurations
    const mailData = [
      { actionCode: "SUBMIT", recipientType: "ROLE", recipientValue: "APPROVAL_TEAM", subjectTemplate: "New Service Request #{requestNumber} Submitted", bodyTemplate: "A new service request has been submitted for your review." },
      { actionCode: "CANCEL", recipientType: "ROLE", recipientValue: "ADMIN", subjectTemplate: "Service Request #{requestNumber} Cancelled", bodyTemplate: "A service request has been cancelled." },
      { actionCode: "APPROVE", recipientType: "ROLE", recipientValue: "SALES_TEAM", subjectTemplate: "Service Request #{requestNumber} Approved", bodyTemplate: "A service request has been approved. Please create quotation." },
      { actionCode: "REJECT", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Service Request #{requestNumber} Rejected", bodyTemplate: "Your service request has been rejected." },
      { actionCode: "SEND_QUOTATION", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Quotation for Service Request #{requestNumber}", bodyTemplate: "Please find the quotation attached." },
      { actionCode: "APPROVE_QUOTATION", recipientType: "ROLE", recipientValue: "INSPECTION_TEAM", subjectTemplate: "Quotation Approved - #{requestNumber}", bodyTemplate: "Quotation approved. Please schedule inspection." },
      { actionCode: "REJECT_QUOTATION", recipientType: "ROLE", recipientValue: "SALES_TEAM", subjectTemplate: "Quotation Rejected - #{requestNumber}", bodyTemplate: "Quotation has been rejected. Please revise." },
      { actionCode: "SCHEDULE_INSPECTION", recipientType: "ROLE", recipientValue: "INSPECTION_TEAM", subjectTemplate: "Inspection Scheduled - #{requestNumber}", bodyTemplate: "Please schedule inspection for this request." },
      { actionCode: "COMPLETE_INSPECTION", recipientType: "ROLE", recipientValue: "OPERATIONS_TEAM", subjectTemplate: "Inspection Completed - #{requestNumber}", bodyTemplate: "Inspection completed. Please start work." },
      { actionCode: "FAIL_INSPECTION", recipientType: "ROLE", recipientValue: "ADMIN", subjectTemplate: "Inspection Failed - #{requestNumber}", bodyTemplate: "Inspection has failed. Action required." },
      { actionCode: "START_WORK", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Work Started - #{requestNumber}", bodyTemplate: "Work has started on your service request." },
      { actionCode: "COMPLETE_WORK", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Work Completed - #{requestNumber}", bodyTemplate: "Work has been completed on your service request." },
      { actionCode: "PUT_ON_HOLD", recipientType: "ROLE", recipientValue: "ADMIN", subjectTemplate: "Request On Hold - #{requestNumber}", bodyTemplate: "Service request has been put on hold." },
      { actionCode: "CLOSE_REQUEST", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Request Closed - #{requestNumber}", bodyTemplate: "Your service request has been closed." },
      { actionCode: "REOPEN", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Request Reopened - #{requestNumber}", bodyTemplate: "Your service request has been reopened." },
      { actionCode: "RECREATE_QUOTATION", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "New Quotation Created - #{requestNumber}", bodyTemplate: "A new quotation has been created." },
      { actionCode: "RESCHEDULE_INSPECTION", recipientType: "ROLE", recipientValue: "INSPECTION_TEAM", subjectTemplate: "Inspection Rescheduled - #{requestNumber}", bodyTemplate: "Please reschedule inspection." },
      { actionCode: "RESUME_WORK", recipientType: "ROLE", recipientValue: "OPERATIONS_TEAM", subjectTemplate: "Work Resumed - #{requestNumber}", bodyTemplate: "Work has been resumed." },
      { actionCode: "CANCEL_FROM_HOLD", recipientType: "ROLE", recipientValue: "ADMIN", subjectTemplate: "Request Cancelled from Hold - #{requestNumber}", bodyTemplate: "Service request has been cancelled." },
      { actionCode: "REOPEN_CANCELLED", recipientType: "REQUESTER", recipientValue: "", subjectTemplate: "Request Reopened - #{requestNumber}", bodyTemplate: "Your cancelled request has been reopened." },
    ];

    for (const m of mailData) {
      if (actions[m.actionCode]) {
        await WorkflowActionMail.create({
          actionId: actions[m.actionCode]._id,
          recipientType: m.recipientType,
          recipientValue: m.recipientValue,
          subjectTemplate: m.subjectTemplate,
          bodyTemplate: m.bodyTemplate,
        });
        console.log(`  Mail: ${m.actionCode}`);
      }
    }

    console.log("\nWorkflow seed completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Workflow seed error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedWorkflow();
