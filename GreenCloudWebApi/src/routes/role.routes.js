import { Router } from "express";
import RoleController from "../controllers/role.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

router.get("/", adminAuth, RoleController.list);
router.get("/:id", adminAuth, RoleController.getById);
router.post("/", adminAuth, RoleController.create);
router.put("/:id", adminAuth, RoleController.update);
router.delete("/:id", adminAuth, RoleController.delete);
router.put("/:id/permissions", adminAuth, RoleController.updatePermissions);

export default router;
