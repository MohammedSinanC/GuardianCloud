import express from "express";
import { create, list, getById, update, submit, approve, reject } from "../controllers/site-inspection.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();
router.use(adminAuth);
router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id", update);
router.post("/:id/submit", submit);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
export default router;
