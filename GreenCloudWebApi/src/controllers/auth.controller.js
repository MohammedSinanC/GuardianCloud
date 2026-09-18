import Admin from "../models/admin.model.js";
import Role from "../models/role.model.js";

class AuthController {
  /** GET /api/auth/me — returns current user info + permissions */
  static async me(req, res) {
    try {
      const admin = await Admin.findById(req.admin.id)
        .populate("companyId", "name code")
        .populate("roleId", "name description permissions");

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      let permissions = {};

      // Super admin gets all permissions
      if (admin.role === "superadmin") {
        permissions = {
          dashboardPage: { visible: true, view: true, create: false, edit: false, delete: false },
          inquiryPage: { visible: true, view: true, create: true, edit: true, delete: true },
          usersPage: { visible: true, view: true, create: true, edit: true, delete: true },
          rolesPage: { visible: true, view: true, create: true, edit: true, delete: true },
          companiesPage: { visible: true, view: true, create: true, edit: true, delete: true },
          reportsPage: { visible: true, view: true, create: false, edit: false, delete: false },
          settingsPage: { visible: true, view: true, create: false, edit: false, delete: false },
        };
      } else if (admin.roleId && admin.roleId.permissions) {
        // Convert Map to plain object
        const perms = admin.roleId.permissions;
        if (perms instanceof Map) {
          perms.forEach((value, key) => {
            permissions[key] = value;
          });
        } else {
          permissions = perms;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: admin._id,
            name: admin.name || admin.username,
            email: admin.email,
            mobile: admin.mobile,
            profileImage: admin.profileImage || "",
            companyId: admin.companyId?._id || admin.companyId,
            companyName: admin.companyId?.name || "",
            roleId: admin.roleId?._id || admin.roleId,
            roleName: admin.roleId?.name || admin.role,
            role: admin.role,
          },
          permissions,
        },
      });
    } catch (error) {
      console.error("Auth Me Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default AuthController;
