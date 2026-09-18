import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Admin from "../src/models/admin.model.js";
import Role from "../src/models/role.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const DEFAULT_ADMIN_PERMISSIONS = {
  dashboardPage: { visible: true, view: true, create: false, edit: false, delete: false },
  leadsPage: { visible: true, view: true, create: true, edit: true, delete: true },
  customersPage: { visible: true, view: true, create: true, edit: true, delete: true },
  inquiryPage: { visible: true, view: true, create: true, edit: true, delete: true },
  quotationsPage: { visible: true, view: true, create: true, edit: true, delete: true },
  invoicesPage: { visible: true, view: true, create: true, edit: true, delete: true },
  ledgerPage: { visible: true, view: true, create: false, edit: false, delete: false },
  usersPage: { visible: true, view: true, create: true, edit: true, delete: true },
  rolesPage: { visible: true, view: true, create: true, edit: true, delete: true },
  companiesPage: { visible: true, view: true, create: true, edit: true, delete: true },
  reportsPage: { visible: true, view: true, create: false, edit: false, delete: false },
  settingsPage: { visible: true, view: true, create: false, edit: false, delete: false },
};

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Ensure an "Admin" role exists — admins without a roleId get empty
    // permissions from /auth/me and every permission-guarded route bounces.
    let adminRole = await Role.findOne({ name: "Admin" });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "Admin",
        description: "Full access to admin panel pages",
        isSystem: false,
        isActive: true,
        permissions: DEFAULT_ADMIN_PERMISSIONS,
      });
      console.log("Role created:", adminRole.name);
    }

    // Keep the Admin role's permission set current (adds new ERP pages
    // without removing any custom permissions the role may have).
    // NOTE: role.permissions is a Mongoose Map — must use .get()/.set(),
    // plain property assignment silently persists nothing.
    let permsChanged = false;
    const perms = adminRole.permissions instanceof Map ? adminRole.permissions : new Map();
    for (const [pageKey, perm] of Object.entries(DEFAULT_ADMIN_PERMISSIONS)) {
      if (!perms.get(pageKey)) {
        perms.set(pageKey, perm);
        permsChanged = true;
      }
    }
    adminRole.permissions = perms;
    if (permsChanged) {
      await adminRole.save();
      console.log("Admin role permissions updated with new ERP pages.");
    }

    const existingAdmin = await Admin.findOne({ username: "admin@gmail.com" });

    if (existingAdmin) {
      // Backfill roleId for accounts created before roles existed
      if (!existingAdmin.roleId) {
        existingAdmin.roleId = adminRole._id;
        await existingAdmin.save();
        console.log("Existing admin backfilled with Admin role.");
      } else {
        console.log("Admin account already exists. Skipping.");
      }
      await mongoose.disconnect();
      process.exit(0);
    }

    const admin = await Admin.create({
      username: "admin@gmail.com",
      password: "abcd",
      role: "admin",
      roleId: adminRole._id,
      isActive: true,
    });

    console.log("Admin account created successfully:");
    console.log("  Username: admin@gmail.com");
    console.log("  Role:", admin.role);
    console.log("  ID:", admin._id);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
