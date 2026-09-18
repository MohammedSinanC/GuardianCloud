import express from "express";
import { list, getById, create, createPublic, update, remove, submit, reject, approve } from "../controllers/lead.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Public website submissions become leads pending admin approval.
router.post("/public", createPublic);

router.use(adminAuth);

router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.post("/:id/submit", submit);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
