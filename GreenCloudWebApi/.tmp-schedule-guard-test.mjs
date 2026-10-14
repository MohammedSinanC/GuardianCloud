// One-off: verify the payment-schedule-required approval flow, then restore seed state.
import mongoose from "mongoose";
import { readFileSync } from "fs";

const uri = (readFileSync(".env", "utf8").match(/MONGO(?:DB)?_URI\s*=\s*(.+)/) || [])[1]?.trim();

const login = await fetch("http://localhost:5001/api/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin@gmail.com", password: "abcd" }),
});
const token = (await login.json()).token;
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

await mongoose.connect(uri);
const db = mongoose.connection.db;

const inv = await db.collection("invoices").findOne({ invoiceNo: "INV-2026-000001" });
const qt = await db.collection("quotations").findOne({ _id: inv.quotationId });
const origQt = { paymentTypeId: qt.paymentTypeId, paymentStartDate: qt.paymentStartDate };
const origInv = { status: inv.status, approvedBy: inv.approvedBy, approvedDate: inv.approvedDate };

// 1. Put invoice in DRAFT, approve must be BLOCKED (no schedule)
await db.collection("invoices").updateOne({ _id: inv._id }, { $set: { status: "DRAFT" } });
const blocked = await fetch(`http://localhost:5001/api/invoices/${inv._id}/approve`, { method: "POST", headers: auth, body: "{}" });
const blockedJson = await blocked.json();
console.log("1. approve w/o schedule blocked:", blocked.status === 400, "|", blockedJson.code, "|", (blockedJson.message || "").slice(0, 80));

// 2. Configure the quotation's payment plan + generate schedule via API
const pt = await db.collection("payment_type_masters").findOne({ isActive: true });
console.log("2. payment type master:", pt ? `${pt.name} (${pt.frequency})` : "NONE");
await db.collection("quotations").updateOne(
  { _id: qt._id },
  { $set: { paymentTypeId: pt._id, paymentStartDate: new Date("2026-10-01") } }
);
const gen = await fetch(`http://localhost:5001/api/quotations/${qt._id}/payment-schedule/generate`, { method: "POST", headers: auth, body: "{}" });
const genJson = await gen.json();
console.log("3. generate schedule:", gen.ok, "|", (genJson.data?.schedule || []).length, "installments,", (genJson.data?.schedule || []).map(s => s.total).join("+"), "=", (genJson.data?.schedule || []).reduce((a, s) => a + s.total, 0).toFixed(2));

// 4. Approve must now SUCCEED
const ok = await fetch(`http://localhost:5001/api/invoices/${inv._id}/approve`, { method: "POST", headers: auth, body: "{}" });
const okJson = await ok.json();
console.log("4. approve with schedule:", ok.ok, "|", okJson.message || "");

// 5. Restore everything
await db.collection("payment_schedules").deleteMany({ quotationId: qt._id });
await db.collection("quotations").updateOne({ _id: qt._id }, { $set: origQt });
await db.collection("invoices").updateOne({ _id: inv._id }, { $set: origInv });
await db.collection("workflow_history").deleteMany({ entityType: "INVOICE", entityId: inv._id, actionCode: { $in: ["APPROVED", "UPDATED"] } });
const fresh = await db.collection("invoices").findOne({ _id: inv._id });
console.log("5. restored:", fresh.status, "| schedules left:", await db.collection("payment_schedules").countDocuments({ quotationId: qt._id }));
await mongoose.disconnect();
process.exit(0);
