import Role from "../models/role.model.js";

class RoleController {
  /** GET /api/roles — list all roles */
  static async list(req, res) {
    try {
      const roles = await Role.find({}).sort({ createdAt: -1 });

      // Convert permissions Map to plain objects for JSON
      const data = roles.map((r) => {
        const obj = r.toObject();
        if (obj.permissions instanceof Map) {
          const perms = {};
          obj.permissions.forEach((v, k) => { perms[k] = v; });
          obj.permissions = perms;
        }
        return obj;
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Role List Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** GET /api/roles/:id — get single role */
  static async getById(req, res) {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      const obj = role.toObject();
      if (obj.permissions instanceof Map) {
        const perms = {};
        obj.permissions.forEach((v, k) => { perms[k] = v; });
        obj.permissions = perms;
      }

      return res.status(200).json({ success: true, data: obj });
    } catch (error) {
      console.error("Role Get Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** POST /api/roles — create role */
  static async create(req, res) {
    try {
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Role name is required" });
      }

      const existing = await Role.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: "Role name already exists" });
      }

      const role = await Role.create({
        name: name.trim(),
        description: description || "",
        permissions: permissions || {},
      });

      return res.status(201).json({ success: true, data: role, message: "Role created successfully" });
    } catch (error) {
      console.error("Role Create Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** PUT /api/roles/:id — update role */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, permissions, isActive } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      if (role.isSystem) {
        return res.status(403).json({ success: false, message: "Cannot modify system role" });
      }

      if (name !== undefined) role.name = name;
      if (description !== undefined) role.description = description;
      if (isActive !== undefined) role.isActive = isActive;
      if (permissions !== undefined) role.permissions = permissions;

      await role.save();

      return res.status(200).json({ success: true, data: role, message: "Role updated successfully" });
    } catch (error) {
      console.error("Role Update Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** DELETE /api/roles/:id — delete role */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      if (role.isSystem) {
        return res.status(403).json({ success: false, message: "Cannot delete system role" });
      }

      await Role.findByIdAndDelete(id);

      return res.status(200).json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
      console.error("Role Delete Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** PUT /api/roles/:id/permissions — update permissions only */
  static async updatePermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      role.permissions = permissions || {};
      await role.save();

      return res.status(200).json({ success: true, data: role, message: "Permissions updated" });
    } catch (error) {
      console.error("Role Permissions Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

export default RoleController;
