import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import Company from "../src/models/company.model.js";
import Role from "../src/models/role.model.js";
import Admin from "../src/models/admin.model.js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Create default company
    let company = await Company.findOne({ code: "DEF" });
    if (!company) {
      company = await Company.create({
        name: "Default Company",
        email: "info@default.com",
        phone: "+971 50 000 0000",
        code: "DEF",
        address: "Dubai, UAE",
        isActive: true,
      });
      console.log("✅ Company created:", company.name);
    } else {
      console.log("ℹ️  Company already exists:", company.name);
    }

    // 2. Create Super Admin role
    let superAdminRole = await Role.findOne({ name: "Super Admin" });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "Super Admin",
        description: "Full system access",
        isSystem: true,
        isActive: true,
        permissions: {
          dashboardPage: { visible: true, view: true, create: false, edit: false, delete: false },
          inquiryPage: { visible: true, view: true, create: true, edit: true, delete: true },
          usersPage: { visible: true, view: true, create: true, edit: true, delete: true },
          rolesPage: { visible: true, view: true, create: true, edit: true, delete: true },
          companiesPage: { visible: true, view: true, create: true, edit: true, delete: true },
          reportsPage: { visible: true, view: true, create: false, edit: false, delete: false },
          settingsPage: { visible: true, view: true, create: false, edit: false, delete: false },
        },
      });
      console.log("✅ Role created:", superAdminRole.name);
    }

    // 3. Create Admin role
    let adminRole = await Role.findOne({ name: "Admin" });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "Admin",
        description: "Company administrator with full access to company data",
        isSystem: false,
        isActive: true,
        permissions: {
          dashboardPage: { visible: true, view: true, create: false, edit: false, delete: false },
          inquiryPage: { visible: true, view: true, create: true, edit: true, delete: true },
          usersPage: { visible: true, view: true, create: true, edit: true, delete: false },
          rolesPage: { visible: false, view: false, create: false, edit: false, delete: false },
          companiesPage: { visible: false, view: false, create: false, edit: false, delete: false },
          reportsPage: { visible: true, view: true, create: false, edit: false, delete: false },
          settingsPage: { visible: true, view: true, create: false, edit: false, delete: false },
        },
      });
      console.log("✅ Role created:", adminRole.name);
    }

    // 4. Create Viewer role
    let viewerRole = await Role.findOne({ name: "Viewer" });
    if (!viewerRole) {
      viewerRole = await Role.create({
        name: "Viewer",
        description: "Read-only access",
        isSystem: false,
        isActive: true,
        permissions: {
          dashboardPage: { visible: true, view: true, create: false, edit: false, delete: false },
          inquiryPage: { visible: true, view: true, create: false, edit: false, delete: false },
          usersPage: { visible: false, view: false, create: false, edit: false, delete: false },
          rolesPage: { visible: false, view: false, create: false, edit: false, delete: false },
          companiesPage: { visible: false, view: false, create: false, edit: false, delete: false },
          reportsPage: { visible: true, view: true, create: false, edit: false, delete: false },
          settingsPage: { visible: true, view: true, create: false, edit: false, delete: false },
        },
      });
      console.log("✅ Role created:", viewerRole.name);
    }

    // 5. Create superadmin user (if not exists)
    let superAdmin = await Admin.findOne({ username: "superadmin" });
    if (!superAdmin) {
      superAdmin = await Admin.create({
        username: "superadmin",
        name: "Super Admin",
        email: "superadmin@greencloud.com",
        mobile: "+971 50 000 0001",
        password: "admin123",
        role: "superadmin",
        companyId: company._id,
        roleId: superAdminRole._id,
        isActive: true,
      });
      console.log("✅ Super Admin user created: superadmin / admin123");
    } else {
      console.log("ℹ️  Super Admin user already exists");
    }

    // 6. Create admin user for the default company
    let adminUser = await Admin.findOne({ username: "admin" });
    if (!adminUser) {
      adminUser = await Admin.create({
        username: "admin",
        name: "Company Admin",
        email: "admin@greencloud.com",
        mobile: "+971 50 000 0002",
        password: "admin123",
        role: "admin",
        companyId: company._id,
        roleId: adminRole._id,
        isActive: true,
      });
      console.log("✅ Admin user created: admin / admin123");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // 7. Create viewer user
    let viewerUser = await Admin.findOne({ username: "viewer" });
    if (!viewerUser) {
      viewerUser = await Admin.create({
        username: "viewer",
        name: "View Only User",
        email: "viewer@greencloud.com",
        mobile: "+971 50 000 0003",
        password: "admin123",
        role: "admin",
        companyId: company._id,
        roleId: viewerRole._id,
        isActive: true,
      });
      console.log("✅ Viewer user created: viewer / admin123");
    } else {
      console.log("ℹ️  Viewer user already exists");
    }

    console.log("\n🎉 RBAC Seed Complete!");
    console.log("\nCredentials:");
    console.log("  Super Admin: superadmin / admin123");
    console.log("  Admin:       admin / admin123");
    console.log("  Viewer:      viewer / admin123");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed Error:", error);
    process.exit(1);
  }
}

seed();
