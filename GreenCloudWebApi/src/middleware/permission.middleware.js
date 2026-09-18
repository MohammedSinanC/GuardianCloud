import Role from "../models/role.model.js";

/**
 * Permission middleware factory.
 * Usage: router.get("/path", adminAuth, checkPermission("inquiryPage", "view"), controller)
 *
 * Flow:
 * 1. req.admin is set by adminAuth middleware
 * 2. Look up the admin's role
 * 3. Check role permissions for the page + action
 * 4. For company admins, also enforce company boundary
 */
export const checkPermission = (page, action) => {
  return async (req, res, next) => {
    try {
      const admin = req.admin;
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Super admins bypass permission checks
      if (admin.role === "superadmin") {
        return next();
      }

      // No role assigned — deny
      if (!admin.roleId) {
        return res.status(403).json({
          success: false,
          message: "No role assigned. Contact administrator.",
        });
      }

      const role = await Role.findById(admin.roleId);
      if (!role || !role.isActive) {
        return res.status(403).json({
          success: false,
          message: "Invalid or inactive role.",
        });
      }

      const pagePermissions = role.permissions.get(page);

      // Page not configured or not visible — deny
      if (!pagePermissions || !pagePermissions.visible) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this page.",
        });
      }

      // Check specific action permission
      if (!pagePermissions[action]) {
        return res.status(403).json({
          success: false,
          message: `You do not have ${action} permission on this page.`,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed.",
      });
    }
  };
};

/**
 * Company access check middleware.
 * Ensures the authenticated user can only access data within their company.
 * Super admins bypass company checks.
 */
export const checkCompanyAccess = (req, res, next) => {
  try {
    const admin = req.admin;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super admins can access all companies
    if (admin.role === "superadmin") {
      req.companyFilter = {}; // no filter = all companies
      return next();
    }

    // Company admins are restricted to their own company
    if (!admin.companyId) {
      return res.status(403).json({
        success: false,
        message: "No company assigned. Contact administrator.",
      });
    }

    req.companyFilter = { companyId: admin.companyId };
    next();
  } catch (error) {
    console.error("Company access check error:", error);
    return res.status(500).json({
      success: false,
      message: "Access check failed.",
    });
  }
};
