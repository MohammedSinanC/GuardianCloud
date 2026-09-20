const port = Number(process.env.PORT) || 5000;

const servers = [
  {
    url: `http://localhost:${port}`,
    description: "Local development",
  },
];

if (process.env.RENDER_EXTERNAL_URL) {
  servers.push({ url: process.env.RENDER_EXTERNAL_URL, description: "Production" });
}

export default {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "GreenCloud API",
      description:
        "Node.js authentication + ERP API for GreenCloud pest-control workflow: " +
        "Leads → Customers → Inquiries → Quotations → Invoices → Account Ledger, " +
        "plus Site Inspections, Work Orders, Receipts and website content management.",
      version: "1.0.0",
      contact: { name: "GreenCloud Dev Team" },
      license: { name: "MIT" },
    },
    servers,
    tags: [
      { name: "Auth", description: "Admin authentication & session" },
      { name: "Admin", description: "Admin profile, dashboard, service requests" },
      { name: "Users", description: "User management" },
      { name: "Roles", description: "Role & permission management" },
      { name: "Companies", description: "Company master data" },
      { name: "Content", description: "Website content management" },
      { name: "Inquiries", description: "Inquiry lifecycle" },
      { name: "Payments", description: "Payment types, quotations & schedules" },
      { name: "Leads", description: "Lead lifecycle: public capture → approval" },
      { name: "Customers", description: "Customer master data" },
      { name: "Quotations", description: "ERP quotation workflow" },
      { name: "Invoices", description: "Invoice workflow: approve → post → cancel" },
      { name: "Ledgers", description: "Customer account ledger" },
      { name: "Site Inspections", description: "Site inspection workflow" },
      { name: "Work Orders", description: "Work order workflow: assign → start → complete" },
      { name: "Receipts", description: "Receipts & posting to ledger" },
      { name: "Workflow", description: "Generic workflow engine: actions, history, config" },
      { name: "Service Requests", description: "Public website service requests" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT obtained from POST /api/admin/login. Send as `Authorization: Bearer <token>`.",
        },
      },
      schemas: {
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Internal server error" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 5 },
          },
        },
        MongoId: {
          type: "string",
          pattern: "^[0-9a-fA-F]{24}$",
          example: "650a1b2c3d4e5f6789012345",
        },
      },
    },
    // Applied globally; public endpoints can override with `security: []`
  },
  // JSDoc comments in these files are parsed for @openapi blocks
  apis: ["./src/routes/*.js"],
};
