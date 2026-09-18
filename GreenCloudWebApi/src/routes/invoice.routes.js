import express from "express";
import { create, list, getById, approve, reject, post, cancel, pdf, send } from "../controllers/invoice.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/post", post);
router.post("/:id/cancel", cancel);
router.get("/:id/pdf", pdf);
router.post("/:id/send", send);

export default router;
