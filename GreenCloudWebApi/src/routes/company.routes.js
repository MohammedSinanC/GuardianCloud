import { Router } from "express";
import CompanyController from "../controllers/company.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

router.get("/", CompanyController.list);
router.get("/:id", CompanyController.getById);
router.post("/", adminAuth, CompanyController.create);
router.put("/:id", adminAuth, CompanyController.update);

export default router;
