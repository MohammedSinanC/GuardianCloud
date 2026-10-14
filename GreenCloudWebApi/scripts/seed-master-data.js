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

// ============ URGENCY TYPES (code + label) ============
const urgencyTypes = [
  { code: "NORMAL", label: "Normal" },
  { code: "URGENT", label: "Urgent" },
  { code: "EMERGENCY", label: "Emergency" },
];

// ============ PROPERTY TYPES (code + label) ============
const propertyTypes = [
  { code: "APARTMENT", label: "Apartment" },
  { code: "VILLA", label: "Villa" },
  { code: "OFFICE", label: "Office" },
  { code: "RETAIL", label: "Retail / Shop" },
  { code: "RESTAURANT", label: "Restaurant / F&B" },
  { code: "HOTEL", label: "Hotel / Hospitality" },
  { code: "WAREHOUSE", label: "Warehouse" },
  { code: "FACTORY", label: "Factory / Industrial" },
  { code: "SCHOOL", label: "School / Nursery" },
  { code: "HOSPITAL", label: "Hospital / Clinic" },
  { code: "RESIDENTIAL_BUILDING", label: "Residential Building" },
  { code: "OTHER", label: "Other" },
];

// ============ POPULATION LEVELS (code + label) ============
const populationLevels = [
  { code: "VERY_LOW", label: "Very Low (up to 5)" },
  { code: "LOW", label: "Low (6 - 20)" },
  { code: "MEDIUM", label: "Medium (21 - 100)" },
  { code: "HIGH", label: "High (101 - 500)" },
  { code: "VERY_HIGH", label: "Very High (500+)" },
];

// ============ ENTRY POINTS (code + label) ============
const entryPoints = [
  { code: "DOOR_GAPS", label: "Gaps under doors" },
  { code: "WINDOWS", label: "Windows / openings" },
  { code: "DRAINS", label: "Floor drains" },
  { code: "VENTS", label: "Ventilation openings" },
  { code: "PIPE_PENETRATIONS", label: "Utility / pipe penetrations" },
  { code: "ROOF_EAVES", label: "Roof / eaves" },
  { code: "BASEMENT", label: "Basement / crawl space" },
  { code: "BALCONY", label: "Balcony / terrace" },
  { code: "SEWER", label: "Sewer / manhole connection" },
  { code: "OTHER", label: "Other" },
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

    const urgency = await seedSection("urgencyTypes", "urgencyTypes", urgencyTypes, "code");
    console.log(`Urgency Types:    +${urgency.added} added, ${urgency.total} total`);

    const property = await seedSection("propertyTypes", "propertyTypes", propertyTypes, "code");
    console.log(`Property Types:   +${property.added} added, ${property.total} total`);

    const population = await seedSection("populationLevels", "populationLevels", populationLevels, "code");
    console.log(`Population:       +${population.added} added, ${population.total} total`);

    const entry = await seedSection("entryPoints", "entryPoints", entryPoints, "code");
    console.log(`Entry Points:     +${entry.added} added, ${entry.total} total`);

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
