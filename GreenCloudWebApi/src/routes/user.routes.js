import { Router } from "express";
import UserController from "../controllers/user.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";
import { checkPermission, checkCompanyAccess } from "../middleware/permission.middleware.js";

const router = Router();

router.get("/", adminAuth, checkCompanyAccess, UserController.list);
router.get("/:id", adminAuth, checkCompanyAccess, UserController.getById);
router.post("/", adminAuth, checkCompanyAccess, UserController.create);
router.put("/:id", adminAuth, checkCompanyAccess, UserController.update);
router.delete("/:id", adminAuth, checkCompanyAccess, UserController.delete);

export default router;
