/**
 * Seed Script: Pest Control Workflow
 * 
 * This script seeds the complete pest control workflow into MongoDB.
 * Run with: node scripts/seed-pest-control-workflow.js
 * 
 * IMPORTANT: This is configuration data only. The API reads from DB.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  Workflow,
  WorkflowStage,
  WorkflowAction,
} from "../src/models/workflow.model.js";

const WORKFLOW_CODE = "PEST_CONTROL";
const ENTITY_TYPE = "INQUIRY";

// ============ STAGES ============
const stages = [
  { stageCode: "CREATED", stageName: "Created", sequence: 1, isInitial: true, isFinal: false, stageType: "normal" },
  { stageCode: "SUBMITTED", stageName: "Submitted", sequence: 2, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "UNDER_REVIEW", stageName: "Under Review", sequence: 3, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "INSPECTION_REQUIRED", stageName: "Inspection Required", sequence: 4, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "INSPECTION_SCHEDULED", stageName: "Inspection Scheduled", sequence: 5, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "INSPECTION_COMPLETED", stageName: "Inspection Completed", sequence: 6, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "QUOTATION_PREPARED", stageName: "Quotation Prepared", sequence: 7, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "QUOTATION_SENT", stageName: "Quotation Sent", sequence: 8, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "QUOTATION_APPROVED", stageName: "Quotation Approved", sequence: 9, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "SERVICE_SCHEDULED", stageName: "Service Scheduled", sequence: 10, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "TECHNICIAN_ASSIGNED", stageName: "Technician Assigned", sequence: 11, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "SERVICE_IN_PROGRESS", stageName: "Service In Progress", sequence: 12, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "SERVICE_COMPLETED", stageName: "Service Completed", sequence: 13, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "INVOICE_GENERATED", stageName: "Invoice Generated", sequence: 14, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "PAYMENT_PENDING", stageName: "Payment Pending", sequence: 15, isInitial: false, isFinal: false, stageType: "normal" },
  { stageCode: "COMPLETED", stageName: "Completed", sequence: 16, isInitial: false, isFinal: true, stageType: "terminal" },
  // Alternative stages
  { stageCode: "REJECTED", stageName: "Rejected", sequence: 100, isInitial: false, isFinal: true, stageType: "reject" },
  { stageCode: "CANCELLED", stageName: "Cancelled", sequence: 101, isInitial: false, isFinal: true, stageType: "terminal" },
  { stageCode: "QUOTATION_REJECTED", stageName: "Quotation Rejected", sequence: 102, isInitial: false, isFinal: false, stageType: "reject" },
  { stageCode: "INSPECTION_FAILED", stageName: "Inspection Failed", sequence: 103, isInitial: false, isFinal: false, stageType: "reject" },
];

// ============ ACTIONS (mapped to stage codes) ============
const actions = [
  // CREATED stage
  { stageCode: "CREATED", actionCode: "SAVE_AS_DRAFT", actionName: "Save as Draft", nextStageCode: "CREATED", buttonColor: "secondary", allowedRoles: [], requiresComment: false, mailRequired: false, displayOrder: 1 },
  { stageCode: "CREATED", actionCode: "SUBMIT", actionName: "Submit", nextStageCode: "SUBMITTED", buttonColor: "primary", allowedRoles: [], requiresComment: false, mailRequired: true, mailRecipients: "APPROVAL_TEAM", displayOrder: 2 },
  { stageCode: "CREATED", actionCode: "CANCEL", actionName: "Cancel", nextStageCode: "CANCELLED", buttonColor: "danger", allowedRoles: ["ADMIN", "CUSTOMER"], requiresComment: true, mailRequired: true, mailRecipients: "ADMIN", displayOrder: 3 },

  // SUBMITTED stage
  { stageCode: "SUBMITTED", actionCode: "ACCEPT", actionName: "Accept Inquiry", nextStageCode: "UNDER_REVIEW", buttonColor: "success", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },
  { stageCode: "SUBMITTED", actionCode: "REJECT", actionName: "Reject Inquiry", nextStageCode: "REJECTED", buttonColor: "danger", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: true, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 2 },

  // UNDER_REVIEW stage
  { stageCode: "UNDER_REVIEW", actionCode: "REQUIRE_INSPECTION", actionName: "Require Inspection", nextStageCode: "INSPECTION_REQUIRED", buttonColor: "primary", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: false, displayOrder: 1 },
  { stageCode: "UNDER_REVIEW", actionCode: "CREATE_QUOTATION", actionName: "Create Quotation", nextStageCode: "QUOTATION_PREPARED", buttonColor: "success", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: false, displayOrder: 2 },
  { stageCode: "UNDER_REVIEW", actionCode: "REJECT", actionName: "Reject", nextStageCode: "REJECTED", buttonColor: "danger", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: true, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 3 },

  // INSPECTION_REQUIRED stage
  { stageCode: "INSPECTION_REQUIRED", actionCode: "SCHEDULE_INSPECTION", actionName: "Schedule Inspection", nextStageCode: "INSPECTION_SCHEDULED", buttonColor: "primary", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: true, mailRecipients: "INSPECTION_TEAM", displayOrder: 1 },
  { stageCode: "INSPECTION_REQUIRED", actionCode: "REJECT", actionName: "Reject", nextStageCode: "REJECTED", buttonColor: "danger", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: true, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 2 },

  // INSPECTION_SCHEDULED stage
  { stageCode: "INSPECTION_SCHEDULED", actionCode: "START_INSPECTION", actionName: "Start Inspection", nextStageCode: "INSPECTION_COMPLETED", buttonColor: "info", allowedRoles: ["ADMIN", "OPERATIONS", "TECHNICIAN"], requiresComment: false, mailRequired: false, displayOrder: 1 },
  { stageCode: "INSPECTION_SCHEDULED", actionCode: "FAIL_INSPECTION", actionName: "Fail Inspection", nextStageCode: "INSPECTION_FAILED", buttonColor: "danger", allowedRoles: ["ADMIN", "OPERATIONS", "TECHNICIAN"], requiresComment: true, mailRequired: true, mailRecipients: "ADMIN", displayOrder: 2 },

  // INSPECTION_COMPLETED stage
  { stageCode: "INSPECTION_COMPLETED", actionCode: "CREATE_QUOTATION", actionName: "Create Quotation", nextStageCode: "QUOTATION_PREPARED", buttonColor: "success", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: false, displayOrder: 1 },
  { stageCode: "INSPECTION_COMPLETED", actionCode: "FAIL_INSPECTION", actionName: "Fail Inspection", nextStageCode: "INSPECTION_FAILED", buttonColor: "danger", allowedRoles: ["ADMIN", "OPERATIONS", "TECHNICIAN"], requiresComment: true, mailRequired: true, mailRecipients: "ADMIN", displayOrder: 2 },

  // QUOTATION_PREPARED stage
  { stageCode: "QUOTATION_PREPARED", actionCode: "SEND_QUOTATION", actionName: "Send Quotation", nextStageCode: "QUOTATION_SENT", buttonColor: "info", allowedRoles: ["ADMIN", "OPERATIONS", "SALES"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // QUOTATION_SENT stage
  { stageCode: "QUOTATION_SENT", actionCode: "APPROVE_QUOTATION", actionName: "Approve Quotation", nextStageCode: "QUOTATION_APPROVED", buttonColor: "success", allowedRoles: ["ADMIN", "OPERATIONS", "CUSTOMER"], requiresComment: false, mailRequired: true, mailRecipients: "OPERATIONS_TEAM", displayOrder: 1 },
  { stageCode: "QUOTATION_SENT", actionCode: "REJECT_QUOTATION", actionName: "Reject Quotation", nextStageCode: "QUOTATION_REJECTED", buttonColor: "danger", allowedRoles: ["ADMIN", "OPERATIONS", "CUSTOMER"], requiresComment: true, mailRequired: true, mailRecipients: "SALES_TEAM", displayOrder: 2 },

  // QUOTATION_APPROVED stage
  { stageCode: "QUOTATION_APPROVED", actionCode: "SCHEDULE_SERVICE", actionName: "Schedule Service", nextStageCode: "SERVICE_SCHEDULED", buttonColor: "primary", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // SERVICE_SCHEDULED stage
  { stageCode: "SERVICE_SCHEDULED", actionCode: "ASSIGN_TECHNICIAN", actionName: "Assign Technician", nextStageCode: "TECHNICIAN_ASSIGNED", buttonColor: "primary", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: true, mailRecipients: "TECHNICIAN", displayOrder: 1 },

  // TECHNICIAN_ASSIGNED stage
  { stageCode: "TECHNICIAN_ASSIGNED", actionCode: "START_SERVICE", actionName: "Start Service", nextStageCode: "SERVICE_IN_PROGRESS", buttonColor: "info", allowedRoles: ["ADMIN", "OPERATIONS", "TECHNICIAN"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // SERVICE_IN_PROGRESS stage
  { stageCode: "SERVICE_IN_PROGRESS", actionCode: "COMPLETE_SERVICE", actionName: "Complete Service", nextStageCode: "SERVICE_COMPLETED", buttonColor: "success", allowedRoles: ["ADMIN", "OPERATIONS", "TECHNICIAN"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },
  { stageCode: "SERVICE_IN_PROGRESS", actionCode: "PUT_ON_HOLD", actionName: "Put on Hold", nextStageCode: "INSPECTION_REQUIRED", buttonColor: "warning", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: true, mailRequired: true, mailRecipients: "ADMIN", displayOrder: 2 },

  // SERVICE_COMPLETED stage
  { stageCode: "SERVICE_COMPLETED", actionCode: "GENERATE_INVOICE", actionName: "Generate Invoice", nextStageCode: "INVOICE_GENERATED", buttonColor: "primary", allowedRoles: ["ADMIN", "OPERATIONS", "FINANCE"], requiresComment: false, mailRequired: false, displayOrder: 1 },

  // INVOICE_GENERATED stage
  { stageCode: "INVOICE_GENERATED", actionCode: "SEND_INVOICE", actionName: "Send Invoice", nextStageCode: "PAYMENT_PENDING", buttonColor: "info", allowedRoles: ["ADMIN", "OPERATIONS", "FINANCE"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // PAYMENT_PENDING stage
  { stageCode: "PAYMENT_PENDING", actionCode: "RECEIVE_PAYMENT", actionName: "Receive Payment", nextStageCode: "COMPLETED", buttonColor: "success", allowedRoles: ["ADMIN", "FINANCE"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // REJECTED stage (can reopen)
  { stageCode: "REJECTED", actionCode: "REOPEN", actionName: "Reopen", nextStageCode: "CREATED", buttonColor: "warning", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: true, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // QUOTATION_REJECTED stage
  { stageCode: "QUOTATION_REJECTED", actionCode: "RECREATE_QUOTATION", actionName: "Create New Quotation", nextStageCode: "QUOTATION_PREPARED", buttonColor: "warning", allowedRoles: ["ADMIN", "OPERATIONS", "SALES"], requiresComment: false, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },

  // INSPECTION_FAILED stage
  { stageCode: "INSPECTION_FAILED", actionCode: "RESCHEDULE_INSPECTION", actionName: "Reschedule Inspection", nextStageCode: "INSPECTION_SCHEDULED", buttonColor: "warning", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: false, mailRequired: true, mailRecipients: "INSPECTION_TEAM", displayOrder: 1 },

  // CANCELLED stage
  { stageCode: "CANCELLED", actionCode: "REOPEN", actionName: "Reopen Request", nextStageCode: "CREATED", buttonColor: "warning", allowedRoles: ["ADMIN", "OPERATIONS"], requiresComment: true, mailRequired: true, mailRecipients: "CUSTOMER", displayOrder: 1 },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.\n");

    // 1. Create/Update Workflow
    console.log("Creating workflow...");
    const workflow = await Workflow.findOneAndUpdate(
      { workflowCode: WORKFLOW_CODE },
      {
        workflowCode: WORKFLOW_CODE,
        workflowName: "Pest Control Workflow",
        entityType: ENTITY_TYPE,
        version: 1,
        isActive: true,
        description: "Complete pest control inquiry to completion workflow",
        createdBy: "seed",
        updatedBy: "seed",
      },
      { upsert: true, new: true }
    );
    console.log(`  Workflow: ${workflow.workflowCode} (${workflow._id})`);

    // 2. Create/Update Stages
    console.log("Creating stages...");
    for (const stage of stages) {
      await WorkflowStage.findOneAndUpdate(
        { workflowCode: WORKFLOW_CODE, stageCode: stage.stageCode },
        {
          workflowCode: WORKFLOW_CODE,
          ...stage,
          isActive: true,
          createdBy: "seed",
          updatedBy: "seed",
        },
        { upsert: true }
      );
      console.log(`  Stage: ${stage.stageCode}`);
    }

    // 3. Create/Update Actions
    console.log("Creating actions...");
    for (const action of actions) {
      await WorkflowAction.findOneAndUpdate(
        {
          workflowCode: WORKFLOW_CODE,
          stageCode: action.stageCode,
          actionCode: action.actionCode,
        },
        {
          workflowCode: WORKFLOW_CODE,
          ...action,
          isActive: true,
          createdBy: "seed",
          updatedBy: "seed",
        },
        { upsert: true }
      );
      console.log(`  Action: ${action.stageCode} → ${action.actionCode} → ${action.nextStageCode || "N/A"}`);
    }

    console.log("\n✅ Pest Control workflow seeded successfully!");
    console.log(`   Stages: ${stages.length}`);
    console.log(`   Actions: ${actions.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
