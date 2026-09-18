import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Lead from "../src/models/lead.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const leads = [
  ["Al Noor Facilities", "Ahmed Hassan", "+971501000001", "Dubai", "GENERAL_PEST_CONTROL", "ANNUAL"],
  ["Marina View Residences", "Sarah Khan", "+971501000002", "Abu Dhabi", "COCKROACH_CONTROL", "QUARTERLY"],
  ["Green Valley Restaurant", "Omar Ali", "+971501000003", "Sharjah", "COMMERCIAL_PEST_CONTROL", "MONTHLY"],
  ["Bright Star School", "Mariam Yusuf", "+971501000004", "Ajman", "TERMITE_CONTROL", "ANNUAL"],
  ["Palm Grove Villas", "John Mathew", "+971501000005", "Dubai", "RESIDENTIAL_PEST_CONTROL", "ONE_TIME"],
  ["City Centre Offices", "Priya Nair", "+971501000006", "Abu Dhabi", "GENERAL_PEST_CONTROL", "QUARTERLY"],
  ["Golden Sands Hotel", "Khalid Saeed", "+971501000007", "Dubai", "BED_BUG_CONTROL", "MONTHLY"],
  ["Al Manar Warehouse", "Ravi Kumar", "+971501000008", "Ras Al Khaimah", "RODENT_CONTROL", "ANNUAL"],
  ["Sunrise Medical Clinic", "Noor Ibrahim", "+971501000009", "Al Ain", "COMMERCIAL_PEST_CONTROL", "QUARTERLY"],
  ["Blue Horizon Tower", "David Wilson", "+971501000010", "Dubai", "MOSQUITO_CONTROL", "MONTHLY"],
  ["Little Steps Nursery", "Fatima Ahmed", "+971501000011", "Sharjah", "GENERAL_PEST_CONTROL", "ANNUAL"],
  ["Coastal Café", "Ali Mohamed", "+971501000012", "Fujairah", "COCKROACH_CONTROL", "MONTHLY"],
  ["Emirates Logistics", "Vikram Singh", "+971501000013", "Abu Dhabi", "RODENT_CONTROL", "QUARTERLY"],
  ["Jumeirah Family Home", "Layla Saeed", "+971501000014", "Dubai", "RESIDENTIAL_PEST_CONTROL", "ONE_TIME"],
  ["Oasis Supermarket", "Hassan Raza", "+971501000015", "Al Ain", "COMMERCIAL_PEST_CONTROL", "MONTHLY"],
  ["North Star Apartments", "Aisha Noor", "+971501000016", "Umm Al Quwain", "BED_BUG_CONTROL", "ANNUAL"],
  ["Modern Fit Gym", "James Brown", "+971501000017", "Sharjah", "GENERAL_PEST_CONTROL", "QUARTERLY"],
  ["Desert Bloom Farm", "Sanjay Patel", "+971501000018", "Ajman", "TERMITE_CONTROL", "ANNUAL"],
  ["Pearl Dental Centre", "Huda Omar", "+971501000019", "Dubai", "COMMERCIAL_PEST_CONTROL", "MONTHLY"],
  ["Royal Palm Offices", "Michael Davis", "+971501000020", "Ras Al Khaimah", "MOSQUITO_CONTROL", "QUARTERLY"],
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Lead.deleteMany({ leadNo: { $regex: "^LD-TEST-" } });

    const records = leads.map(([companyName, contactPerson, mobile, location, serviceRequired, contract], index) => ({
      leadNo: `LD-TEST-${String(index + 1).padStart(4, "0")}`,
      status: "DRAFT",
      source: index % 3 === 0 ? "WEBSITE" : index % 3 === 1 ? "PHONE" : "REFERRAL",
      companyName,
      contactPerson,
      mobile,
      email: `lead${index + 1}@example.com`,
      address: `${location} business district`,
      location,
      serviceRequired,
      contract,
      preferredTime: index % 2 === 0 ? "MORNING" : "AFTERNOON",
      description: `Initial pest control request for ${companyName}.`,
      notes: "Seeded draft lead for development testing.",
      createdByName: "Seed Data",
    }));

    const created = await Lead.insertMany(records);
    console.log(`Seeded ${created.length} DRAFT leads.`);
  } catch (error) {
    console.error("Lead seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
