import express from "express";
import { getLedger, getTransactions } from "../controllers/ledger.controller.js";
import adminAuth from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(adminAuth);

router.get("/:customerId", getLedger);
router.get("/:customerId/transactions", getTransactions);

export default router;
