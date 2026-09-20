/**
 * Seed Script: Master Data (Inspection Types + Checklist)
 *
 * Seeds the website_content sections used by the admin Settings masters.
 * Run with: npm run seed:master
 *
 * Safe to re-run: existing sections are merged (missing codes appended),
 * user-entered items are never removed or overwritten.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import WebsiteContent from "../src/models/website-content.model.js";

// ============ INSPECTION TYPES (code + label) ============
const inspectionTypes = [
  { code: "GENERAL", label: "General Pest Inspection" },
  { code: "TERMITE", label: "Termite Inspection" },
  { code: "RODENT", label: "Rodent Inspection" },
  { code: "COCKROACH", label: "Cockroach Inspection" },
  { code: "MOSQUITO", label: "Mosquito Control Survey" },
  { code: "BED_BUG", label: "Bed Bug Inspection" },
  { code: "FUMIGATION", label: "Fumigation Assessment" },
  { code: "FOLLOW_UP", label: "Follow-up Inspection" },
];

// ============ CHECKLIST (code + name + controlType) ============
const checklists = [
  { code: "PEST_DROPPINGS", name: "Signs of pest droppings", controlType: "CHECKBOX" },
  { code: "NESTING_SITES", name: "Nesting sites observed", controlType: "CHECKBOX" },
  { code: "GNAW_MARKS", name: "Gnaw marks or structural damage", controlType: "CHECKBOX" },
  { code: "ENTRY_POINTS", name: "Possible entry points identified", controlType: "CHECKBOX" },
  { code: "MOISTURE_LEAKS", name: "Moisture or leakage issues", controlType: "CHECKBOX" },
  { code: "WASTE_MANAGEMENT", name: "Waste management practices adequate", controlType: "CHECKBOX" },
  { code: "PEST_SPECIES", name: "Suspected pest species", controlType: "TEXTBOX" },
  { code: "INFESTATION_LEVEL", name: "Estimated infestation level", controlType: "TEXTBOX" },
  { code: "AFFECTED_AREAS", name: "Affected areas observed", controlType: "TEXTBOX" },
  { code: "RECOMMENDATIONS", name: "Additional inspector recommendations", controlType: "TEXTBOX" },
];

/**
 * Merge helper: keeps existing items, appends only codes that are missing.
 */
async function seedSection(key, section, items, codeField) {
  const existing = await WebsiteContent.findOne({ key });
  if (!existing) {
    await WebsiteContent.create({ key, section, data: items, isActive: true });
    return { added: items.length, total: items.length };
  }
  const current = Array.isArray(existing.data) ? existing.data : [];
  const have = new Set(current.map((i) => i[codeField]));
  const missing = items.filter((i) => !have.has(i[codeField]));
  if (missing.length) {
    existing.data = [...current, ...missing];
    existing.section = section;
    await existing.save();
  }
  return { added: missing.length, total: current.length + missing.length };
}

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.\n");

    const inspections = await seedSection("inspectionTypes", "inspectionTypes", inspectionTypes, "code");
    console.log(`Inspection Types: +${inspections.added} added, ${inspections.total} total`);

    const checklist = await seedSection("checklists", "checklists", checklists, "code");
    console.log(`Checklist:        +${checklist.added} added, ${checklist.total} total`);

    console.log("\n✅ Master data seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
