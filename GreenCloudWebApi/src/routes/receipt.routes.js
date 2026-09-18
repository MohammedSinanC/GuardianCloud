import express from "express";
import { create, list, getById, post } from "../controllers/receipt.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();
router.use(adminAuth);
router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.post("/:id/post", post);
export default router;
