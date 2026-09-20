import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import companyRoutes from "./routes/company.routes.js"
import serviceRequest from "./routes/servicerequest.routes.js"
import adminRoutes from "./routes/admin.routes.js"
import workflowRoutes from "./routes/workflow.routes.js"
import inquiryRoutes from "./routes/inquiry.routes.js"
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import roleRoutes from "./routes/role.routes.js"
import contentRoutes from "./routes/content.routes.js"
import paymentRoutes from "./routes/payment.routes.js"
import leadRoutes from "./routes/lead.routes.js"
import customerRoutes from "./routes/customer.routes.js"
import quotationErpRoutes from "./routes/quotation-erp.routes.js"
import invoiceRoutes from "./routes/invoice.routes.js"
import ledgerRoutes from "./routes/ledger.routes.js"
import siteInspectionRoutes from "./routes/site-inspection.routes.js"
import workOrderRoutes from "./routes/work-order.routes.js"
import receiptRoutes from "./routes/receipt.routes.js"
import swaggerUi from "swagger-ui-express"
import swaggerJsdoc from "swagger-jsdoc"
import swaggerDefinition from "./docs/swagger.js"

const app = express();
dotenv.config();
const APIURL = process.env.API_VERSION || '/api/v1'

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get("/", (req, res) => {
  res.json({ message: "Node Auth API is running" });
});

// Auth routes
app.use(APIURL + "/CompanyDetails", companyRoutes)
app.use(APIURL + "/User/ServiceRequst", serviceRequest)
app.use("/api/admin", adminRoutes)
app.use("/api/workflow", workflowRoutes)
app.use("/api/inquiries", inquiryRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/roles", roleRoutes)
app.use("/api/companies", companyRoutes)
app.use("/api/content", contentRoutes)
app.use("/api", paymentRoutes)

// ERP: Lead → Customer → Inquiry → Quotation → Invoice → Account Ledger
app.use("/api/leads", leadRoutes)
app.use("/api/customers", customerRoutes)
app.use("/api/quotations", quotationErpRoutes)
app.use("/api/invoices", invoiceRoutes)
app.use("/api/ledgers", ledgerRoutes)
app.use("/api/site-inspections", siteInspectionRoutes)
app.use("/api/work-orders", workOrderRoutes)
app.use("/api/receipts", receiptRoutes)

// API documentation — Swagger UI at /api-docs, raw OpenAPI 3 spec at /api-docs.json
const openapiSpec = swaggerJsdoc(swaggerDefinition)
app.get("/api-docs.json", (req, res) => res.json(openapiSpec))
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: "GreenCloud API Docs",
  swaggerOptions: { persistAuthorization: true },
}))

console.log(`Lead routes: /api/leads`);
console.log(`Customer routes: /api/customers`);
console.log(`Quotation ERP routes: /api/quotations/:id/(approve|reject|pdf|send)`);
console.log(`Invoice routes: /api/invoices`);
console.log(`Ledger routes: /api/ledgers/:customerId`);
console.log(`Site inspection routes: /api/site-inspections`);
console.log(`Work order routes: /api/work-orders`);
console.log(`Receipt routes: /api/receipts`);

console.log(`Service Request route: POST ${APIURL}/User/ServiceRequst`);
console.log(`Admin routes: /api/admin`);
console.log(`Workflow routes: /api/workflow`);
console.log(`Inquiry routes: /api/inquiries`);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;
