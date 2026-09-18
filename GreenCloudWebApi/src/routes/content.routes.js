import { Router } from "express";
import WebsiteContentController from "../controllers/website-content.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = Router();

router.get("/", WebsiteContentController.getAll);
router.get("/:key", WebsiteContentController.getByKey);
router.put("/:key", adminAuth, WebsiteContentController.update);
router.post("/seed", adminAuth, WebsiteContentController.seedAll);

export default router;
