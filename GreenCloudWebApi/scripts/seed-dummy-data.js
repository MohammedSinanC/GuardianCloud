/**
 * Seed Script: Dummy Data for Dashboard Testing
 *
 * Creates:
 *  - 10 Admin/User accounts (mixed active/inactive for pending verification)
 *  - 100 Inquiry records with realistic pest control data
 *  - 30 Quotation records
 *
 * Run with: node scripts/seed-dummy-data.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Import models
import Admin from "../src/models/admin.model.js";
import Inquiry from "../src/models/inquiry.model.js";
import { WorkflowHistory } from "../src/models/workflow.model.js";

// ============ CONFIGURATION ============
const INQUIRY_COUNT = 100;
const ADMIN_COUNT = 10;

const FIRST_NAMES = [
  "Ahmed", "Mohammed", "Ali", "Omar", "Hassan", "Ibrahim", "Khalid", "Youssef",
  "Fatima", "Mariam", "Sara", "Aisha", "Layla", "Noor", "Zahra", "Huda",
  "John", "David", "Michael", "James", "Robert", "William", "Richard", "Thomas",
  "Priya", "Ananya", "Deepika", "Neha", "Riya", "Pooja", "Kavya", "Meera",
  "Chen", "Wei", "Ming", "Jun", "Li", "Zhang", "Wang", "Liu",
  "Raj", "Sanjay", "Amit", "Vikram", "Arjun", "Ravi", "Kiran", "Manoj",
];

const LAST_NAMES = [
  "Al-Rashid", "Al-Mansoori", "Khan", "Patel", "Sharma", "Gupta",
  "Williams", "Johnson", "Brown", "Davis", "Miller", "Wilson",
  "Mohamed", "Hussain", "Ibrahim", "Abdullah", "Al-Hassan", "Saeed",
  "Fernandez", "Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez",
  "Singh", "Kumar", "Reddy", "Nair", "Menon", "Iyer",
  "Li", "Zhang", "Wang", "Chen", "Liu", "Yang",
];

const LOCATIONS = [
  "Abu Dhabi", "Abu Dhabi", "Abu Dhabi", "Abu Dhabi",
  "Dubai", "Dubai", "Dubai", "Dubai",
  "Sharjah", "Sharjah", "Sharjah",
  "Ajman",
  "Al Ain",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

const BUILDINGS = [
  "Al Reem Tower", "Etihad Tower", "Khalifa Tower", "Marina Tower",
  "Golden Sands", "Sky Garden", "Palm Jumeirah", "Business Bay Tower",
  "Jumeirah Beach Residence", "Creek Tower", "Corniche Tower", "Island Tower",
  "Al Bateen Tower", "Tourist Club Tower", "Hamdan Tower", "City Tower",
];

const PEST_TYPES = ["COCKROACH", "BED_BUG", "ANT", "MOSQUITO", "RODENT", "TERMITE", "FLY", "OTHER"];

const STAGES = [
  "CREATED", "SUBMITTED", "UNDER_REVIEW", "INSPECTION_REQUIRED",
  "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "QUOTATION_PREPARED",
  "QUOTATION_SENT", "QUOTATION_APPROVED", "SERVICE_SCHEDULED",
  "TECHNICIAN_ASSIGNED", "SERVICE_IN_PROGRESS", "SERVICE_COMPLETED",
  "INVOICE_GENERATED", "PAYMENT_PENDING", "COMPLETED",
  "REJECTED", "CANCELLED",
];

// Weighted stages — most inquiries should be in early stages
const STAGE_WEIGHTS = [
  { stage: "CREATED", weight: 5 },
  { stage: "SUBMITTED", weight: 12 },
  { stage: "UNDER_REVIEW", weight: 10 },
  { stage: "INSPECTION_REQUIRED", weight: 8 },
  { stage: "INSPECTION_SCHEDULED", weight: 7 },
  { stage: "INSPECTION_COMPLETED", weight: 8 },
  { stage: "QUOTATION_PREPARED", weight: 6 },
  { stage: "QUOTATION_SENT", weight: 7 },
  { stage: "QUOTATION_APPROVED", weight: 5 },
  { stage: "SERVICE_SCHEDULED", weight: 5 },
  { stage: "TECHNICIAN_ASSIGNED", weight: 4 },
  { stage: "SERVICE_IN_PROGRESS", weight: 5 },
  { stage: "SERVICE_COMPLETED", weight: 6 },
  { stage: "INVOICE_GENERATED", weight: 3 },
  { stage: "PAYMENT_PENDING", weight: 3 },
  { stage: "COMPLETED", weight: 4 },
  { stage: "REJECTED", weight: 2 },
  { stage: "CANCELLED", weight: 2 },
];

const DESCRIPTIONS = [
  "Cockroach infestation in kitchen area, visible during night hours",
  "Bed bugs found in bedrooms, bites reported by family members",
  "Ant trails observed running along kitchen counter and walls",
  "Mosquitoes breeding near standing water in garden area",
  "Rat droppings found in pantry and storage area",
  "Termite damage noticed on wooden furniture and door frames",
  "Flies聚集 near garbage area, need immediate treatment",
  "Heavy cockroach activity in restaurant kitchen",
  "Termites damaging structural wooden beams in office",
  "Rodent activity in ceiling void, scratching sounds at night",
  "Bed bug infestation in hotel rooms on 3rd floor",
  "Mosquito control needed for outdoor event area",
  "Ant colony in bathroom wall causing damp patches",
  "Fly infestation in food processing area",
  "Cockroaches in hospital ward storage room",
  "Rats entering from drainage system in basement",
  "Termite treatment required for entire building perimeter",
  "Pest sighting during routine inspection",
  "Customer reporting multiple pest types in apartment",
  "Urgent pest issue in food service establishment",
];

const PROBLEM_DESCRIPTIONS = [
  "Multiple cockroaches seen every night, especially in kitchen area near sink and stove. They appear after dark and scatter when lights are turned on. Customer has tried DIY sprays without success.",
  "Bed bugs discovered on mattress seams and headboard. Family members have waking up with itchy red bites. Issue has been ongoing for 2 weeks.",
  "Long trails of ants crossing from window frame to kitchen counter. They are attracted to food items. Approximately 50+ ants visible at any time.",
  "Mosquitoes are breeding in flower pots and drainage areas around the property. High number of bites reported, especially during evening hours.",
  "Rat droppings found in pantry, behind refrigerator, and in storage cabinets. Scratching sounds heard from ceiling void at night. Possible entry point through drainage.",
  "Termite mud tubes observed along baseboards and door frames. Wooden furniture showing signs of internal damage. Multiple rooms affected.",
  "Cluster of flies near waste disposal area. Issue persists despite regular cleaning. Affecting customer comfort and hygiene standards.",
  "Commercial kitchen experiencing persistent cockroach problem despite daily cleaning. Health inspection approaching in 2 weeks.",
  "Office space showing signs of termite damage to wooden partition walls and shelving units. Structural assessment recommended.",
  "Multiple pest types observed: cockroaches in kitchen, ants in bathroom, and occasional flies. Comprehensive treatment needed.",
];

const REMARKS_OPTIONS = [
  "Customer requested morning appointment only",
  "Building requires security access arrangement",
  "Ground floor apartment with garden access",
  "High-rise building, elevator access required",
  "Commercial property - after hours treatment preferred",
  "Customer has pets (cats) - pet-safe products required",
  "Child-friendly property, use non-toxic solutions",
  "Multiple units may be affected, coordination needed",
  "Customer is a returning client",
  "Priority customer - VIP treatment",
  "",
  "",
  "",
  "",
  "",
];

const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", ""];
const URGENCIES = ["NORMAL", "NORMAL", "NORMAL", "URGENT", "URGENT", "EMERGENCY"];

// ============ HELPER FUNCTIONS ============

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN(arr, min = 1, max = 2) {
  const n = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function pickWeightedStage() {
  const totalWeight = STAGE_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const sw of STAGE_WEIGHTS) {
    random -= sw.weight;
    if (random <= 0) return sw.stage;
  }
  return "SUBMITTED";
}

function randomDate(daysBackMin, daysBackMax) {
  const daysBack = Math.floor(Math.random() * (daysBackMax - daysBackMin) + daysBackMin);
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function getStatusFromStage(stage) {
  if (["COMPLETED"].includes(stage)) return "completed";
  if (["REJECTED", "CANCELLED"].includes(stage)) return "rejected";
  return "active";
}

// ============ SEED ============

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.\n");

    // 1. Clear existing dummy data
    console.log("Clearing existing data...");
    await Admin.deleteMany({ username: { $regex: "^test" } });
    await Inquiry.deleteMany({ inquiryNo: { $regex: "^PCI-TEST" } });
    console.log("  Done.\n");

    // 2. Create Admin/User accounts
    console.log(`Creating ${ADMIN_COUNT} user accounts...`);
    const admins = [];
    for (let i = 0; i < ADMIN_COUNT; i++) {
      const admin = await Admin.create({
        username: `testuser${i + 1}@gmail.com`,
        email: `testuser${i + 1}@gmail.com`,
        password: "password123",
        role: i < 3 ? "superadmin" : "admin",
        isActive: i < 8, // 2 users inactive = pending verification
      });
      admins.push(admin);
      console.log(`  User: ${admin.username} (${admin.role}, active: ${admin.isActive})`);
    }
    console.log(`  Created ${admins.length} users.\n`);

    // 3. Create Inquiries
    console.log(`Creating ${INQUIRY_COUNT} inquiries...`);
    const inquiries = [];
    let counter = 1;

    for (let i = 0; i < INQUIRY_COUNT; i++) {
      const firstName = pickRandom(FIRST_NAMES);
      const lastName = pickRandom(LAST_NAMES);
      const customerName = `${firstName} ${lastName}`;
      const stage = pickWeightedStage();
      const status = getStatusFromStage(stage);
      const location = pickRandom(LOCATIONS);
      const pestTypes = pickRandomN(PEST_TYPES, 1, 3);
      const createdDate = randomDate(0, 365); // Within last year

      const inquiry = new Inquiry({
        inquiryNo: `PCI-TEST-${String(counter).padStart(6, "0")}`,
        workflowCode: "PEST_CONTROL",
        currentStageCode: stage,
        status,
        customerName,
        contactPerson: customerName,
        mobile: `+971${Math.floor(Math.random() * 900000000 + 500000000)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@email.com`,
        serviceLocation: location,
        building: pickRandom(BUILDINGS),
        unit: `${Math.floor(Math.random() * 30) + 1}${pickRandom(["A", "B", "C", ""])}`.trim(),
        area: `${Math.floor(Math.random() * 500) + 50} sqft`,
        pestTypes,
        problemDescription: pickRandom(PROBLEM_DESCRIPTIONS),
        preferredDate: randomDate(-30, 60),
        preferredTime: pickRandom(TIMES),
        urgency: pickRandom(URGENCIES),
        remarks: pickRandom(REMARKS_OPTIONS),
        createdByName: customerName,
      });

      // Override createdAt to simulate historical data
      inquiry.createdAt = createdDate;
      inquiry.updatedAt = createdDate;

      await inquiry.save();
      inquiries.push(inquiry);
      counter++;

      if (i % 20 === 0) {
        console.log(`  Progress: ${i + 1}/${INQUIRY_COUNT}`);
      }
    }
    console.log(`  Created ${inquiries.length} inquiries.\n`);

    // 4. Create workflow history for each inquiry
    console.log("Creating workflow history records...");
    let historyCount = 0;
    for (const inquiry of inquiries) {
      const stageIndex = STAGES.indexOf(inquiry.currentStageCode);
      if (stageIndex <= 0) continue;

      // Create history for each stage up to current
      const historyStages = STAGES.slice(0, stageIndex + 1);
      for (let j = 0; j < historyStages.length - 1; j++) {
        const fromStage = historyStages[j];
        const toStage = historyStages[j + 1];
        const actionDate = new Date(inquiry.createdAt);
        actionDate.setDate(actionDate.getDate() + j + 1);

        await WorkflowHistory.create({
          workflowCode: "PEST_CONTROL",
          entityType: "INQUIRY",
          entityId: inquiry._id,
          fromStageCode: fromStage,
          toStageCode: toStage,
          actionCode: toStage.toLowerCase(),
          actionName: `Move to ${toStage.replace(/_/g, " ")}`,
          performedBy: pickRandom(admins)._id,
          performedByName: pickRandom(admins).username,
          performedByRole: pickRandom(admins).role.toUpperCase(),
          comment: `Workflow transition from ${fromStage} to ${toStage}`,
          createdAt: actionDate,
        });
        historyCount++;
      }
    }
    console.log(`  Created ${historyCount} history records.\n`);

    // 5. Summary
    const totalInquiries = await Inquiry.countDocuments();
    const totalAdmins = await Admin.countDocuments();
    const stageBreakdown = await Inquiry.aggregate([
      { $group: { _id: "$currentStageCode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("=" .repeat(50));
    console.log("SEED COMPLETE!");
    console.log("=" .repeat(50));
    console.log(`  Inquiries: ${totalInquiries}`);
    console.log(`  Users:     ${totalAdmins}`);
    console.log(`  History:   ${historyCount}`);
    console.log("\n  Stage Breakdown:");
    for (const s of stageBreakdown) {
      console.log(`    ${s._id.padEnd(25)} ${s.count}`);
    }
    console.log("\n  Login Credentials:");
    console.log("    Username: testuser1@gmail.com");
    console.log("    Password: password123");
    console.log("=" .repeat(50));

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
