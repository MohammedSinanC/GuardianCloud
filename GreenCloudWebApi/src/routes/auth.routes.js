import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

router.get("/me", adminAuth, AuthController.me);

export default router;
