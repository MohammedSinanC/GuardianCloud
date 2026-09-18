import { Router } from "express";
import AdminController from "../controllers/admin.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

// Public
router.post("/login", AdminController.login);

// Protected
router.get("/profile", adminAuth, AdminController.profile);
router.get("/dashboard", adminAuth, AdminController.dashboard);
router.put("/service-requests/:id/schedule", adminAuth, AdminController.updateSchedule);

export default router;
