import express from "express";
import ServiceRequestController from "../controllers/servicerequest.controller.js";

const router = express.Router();

router.post("/", ServiceRequestController.create);

export default router;