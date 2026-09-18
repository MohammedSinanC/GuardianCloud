import ServiceRequest from "../models/user.model.js";

class ServiceRequestController {
    // Create Service Request
    static async create(req, res) {
        try {
            const { fullName, phoneNumber, email, service, contract, location, preferredDate, message, reqStatus } = req.body;
            // Validation
            if (!fullName || !phoneNumber || !email || !service || !contract || !location || !message) {
                return res.status(400).json({ success: false, message: "Please fill all required fields", });
            }
            // Save to MongoDB 
            const serviceRequest = await ServiceRequest.create({ fullName, phoneNumber, email, service, contract, location, reqStatus, preferredDate: preferredDate || null, message, });

            return res.status(201).json({
                success: true,
                message: "Service request submitted successfully",
                data: [],
            });
        } catch (error) {
            console.error("Service Request Error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to submit service request",
            });
        }
    }
}

export default ServiceRequestController;