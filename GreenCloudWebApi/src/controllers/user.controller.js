import Admin from "../models/admin.model.js";
import Role from "../models/role.model.js";
import mongoose from "mongoose";

class UserController {
  /** GET /api/users — list users (company-filtered for company admins) */
  static async list(req, res) {
    try {
      const admin = req.admin;
      const { page = 1, limit = 50, search = "" } = req.query;

      let filter = {};

      // Company admins only see their own company's users
      if (admin.role !== "superadmin" && admin.companyId) {
        filter.companyId = admin.companyId;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Admin.countDocuments(filter);
      const users = await Admin.find(filter)
        .populate("companyId", "name code")
        .populate("roleId", "name")
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      return res.status(200).json({
        success: true,
        data: users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("User List Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** GET /api/users/:id — get single user */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const admin = req.admin;

      const user = await Admin.findById(id)
        .populate("companyId", "name code")
        .populate("roleId", "name description permissions")
        .select("-password");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Company admin can only see their own company's users
      if (admin.role !== "superadmin" && admin.companyId) {
        if (String(user.companyId?._id || user.companyId) !== String(admin.companyId)) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
      }

      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error("User Get Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** POST /api/users — create user */
  static async create(req, res) {
    try {
      const admin = req.admin;
      const { username, name, email, mobile, password, roleId, companyId, isActive, profileImage } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
      }

      // Determine companyId
      let userCompanyId = companyId;
      if (admin.role !== "superadmin") {
        // Company admins can only create users in their own company
        userCompanyId = admin.companyId;
      }

      if (!userCompanyId) {
        return res.status(400).json({ success: false, message: "Company is required" });
      }

      // Check username uniqueness
      const existing = await Admin.findOne({ username: username.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }

      const newUser = await Admin.create({
        username: username.toLowerCase().trim(),
        name: name || "",
        email: email || "",
        mobile: mobile || "",
        password,
        role: "admin",
        companyId: userCompanyId,
        roleId: roleId || null,
        isActive: isActive !== undefined ? isActive : true,
        profileImage: profileImage || "",
      });

      const populated = await Admin.findById(newUser._id)
        .populate("companyId", "name code")
        .populate("roleId", "name")
        .select("-password");

      return res.status(201).json({ success: true, data: populated, message: "User created successfully" });
    } catch (error) {
      console.error("User Create Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** PUT /api/users/:id — update user */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const admin = req.admin;
      const { name, email, mobile, roleId, companyId, isActive, profileImage } = req.body;

      const user = await Admin.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Company admin can only update their own company's users
      if (admin.role !== "superadmin" && admin.companyId) {
        if (String(user.companyId) !== String(admin.companyId)) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
      }

      // Update fields
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (mobile !== undefined) user.mobile = mobile;
      if (roleId !== undefined) user.roleId = roleId;
      if (isActive !== undefined) user.isActive = isActive;
      if (profileImage !== undefined) user.profileImage = profileImage;

      // Only super admin can change company
      if (admin.role === "superadmin" && companyId !== undefined) {
        user.companyId = companyId;
      }

      await user.save();

      const populated = await Admin.findById(user._id)
        .populate("companyId", "name code")
        .populate("roleId", "name")
        .select("-password");

      return res.status(200).json({ success: true, data: populated, message: "User updated successfully" });
    } catch (error) {
      console.error("User Update Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** DELETE /api/users/:id — deactivate user */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const admin = req.admin;

      const user = await Admin.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Company admin can only delete their own company's users
      if (admin.role !== "superadmin" && admin.companyId) {
        if (String(user.companyId) !== String(admin.companyId)) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
      }

      // Cannot delete self
      if (String(user._id) === String(admin.id)) {
        return res.status(400).json({ success: false, message: "Cannot delete your own account" });
      }

      user.isActive = false;
      await user.save();

      return res.status(200).json({ success: true, message: "User deactivated successfully" });
    } catch (error) {
      console.error("User Delete Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

export default UserController;
