import express from "express";
import ServiceRequestController from "../controllers/servicerequest.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/v1/User/ServiceRequst:
 *   post:
 *     summary: Submit a service request from the website
 *     description: Public endpoint for the website booking form. Note the historical endpoint spelling ("ServiceRequst").
 *     tags: [Service Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phoneNumber: { type: string }
 *               email: { type: string, format: email }
 *               service: { type: string }
 *               contract: { type: string }
 *               location: { type: string }
 *               preferredDate: { type: string, format: date }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Service request created
 *       400:
 *         description: Validation error
 */
router.post("/", ServiceRequestController.create);

export default router;