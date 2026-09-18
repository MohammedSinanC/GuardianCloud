import dotenv from "dotenv";
dotenv.config();

const BASE = "http://localhost:5000/api";
let token = "";

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/pdf")) {
    const buf = await res.arrayBuffer();
    return { status: res.status, pdf: true, bytes: buf.byteLength };
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

function check(name, cond, extra = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  // 1. Login
  const login = await api("POST", "/admin/login", { username: "admin@gmail.com", password: "abcd" });
  check("Admin login", login.success && login.token);
  token = login.token;

  // 2. Create lead (DRAFT)
  const lead = await api("POST", "/leads", {
    companyName: `Smoke Test Co ${Date.now()}`,
    contactPerson: "Test Person",
    mobile: "+971500000999",
    email: `smoke${Date.now()}@test.com`,
    address: "Test Address, Abu Dhabi",
    location: "Mussafah",
    serviceRequired: "COCKROACH_CONTROL",
    description: "Smoke test lead",
  });
  check("Lead created (DRAFT)", lead.success && lead.data?.leadNo, lead.data?.leadNo);
  const leadId = lead.data?._id;

  // 3. Submit → PENDING_APPROVAL (workflow rule: DRAFT must be submitted first)
  const sub = await api("POST", `/leads/${leadId}/submit`, {});
  check("Lead submitted", sub.success && sub.data?.status === "PENDING_APPROVAL", sub.message);

  // 4. Approve → should create customer + user + ledger + inquiry
  const appr = await api("POST", `/leads/${leadId}/approve`, {});
  check("Lead approved", appr.success, appr.message);
  check("Customer created", !!appr.data?.customerId, appr.data?.customerCode);
  check("Ledger created", !!appr.data?.ledgerId);
  check("Inquiry created", !!appr.data?.inquiryId, appr.data?.inquiryNo);
  const customerId = appr.data?.customerId;
  const inquiryId = appr.data?.inquiryId;

  // 3b. Re-approve → idempotent, no duplicates
  const appr2 = await api("POST", `/leads/${leadId}/approve`, {});
  check("Re-approve is idempotent", appr2.success && appr2.alreadyApproved === true);

  // 4. Create quotation on the inquiry
  const qt = await api("POST", `/inquiries/${inquiryId}/quotation`, {
    items: [{ description: "Cockroach treatment — 1 visit", quantity: 2, unitPrice: 500 }],
    taxRate: 5,
    terms: "50% advance",
    notes: "Smoke test quotation",
  });
  check("Quotation created", qt.success && qt.data?.quotationNo, qt.data?.quotationNo);
  const quotationId = qt.data?._id;
  check("Quotation total = 1050", Math.round(qt.data?.totalAmount) === 1050, String(qt.data?.totalAmount));

  // 5. Generate payment schedule (existing feature must keep working)
  await api("PUT", `/inquiries/${inquiryId}/quotation`, { paymentTypeId: null });
  const ptList = await api("GET", "/payment-types");
  const pt = ptList.data?.[0];
  if (pt) {
    await api("PUT", `/inquiries/${inquiryId}/quotation`, {
      paymentTypeId: pt._id,
      paymentStartDate: new Date().toISOString(),
    });
    const sched = await api("POST", `/quotations/${quotationId}/payment-schedule/generate`, {});
    check("Payment schedule generated", sched.success, `${sched.data?.schedule?.length || 0} payments`);
  } else {
    console.log("ℹ️  No payment types configured — skipping schedule test");
  }

  // 6. Quotation PDF
  const qpdf = await api("GET", `/quotations/${quotationId}/pdf`);
  check("Quotation PDF generated", qpdf.pdf === true && qpdf.status === 200, `${qpdf.bytes || 0} bytes`);

  // 7. Approve quotation
  const qappr = await api("POST", `/quotations/${quotationId}/approve`, {});
  check("Quotation approved", qappr.success, qappr.message);

  // 8. Create invoice from quotation
  const inv = await api("POST", "/invoices", { quotationId });
  check("Invoice created", inv.success && inv.data?.invoiceNo, inv.data?.invoiceNo);
  const invoiceId = inv.data?._id;
  check("Invoice total = 1050", Math.round(inv.data?.totalAmount) === 1050, String(inv.data?.totalAmount));

  // 8b. Duplicate invoice rejected
  const invDup = await api("POST", "/invoices", { quotationId });
  check("Duplicate invoice rejected", invDup.status === 409);

  // 9. Invoice PDF
  const ipdf = await api("GET", `/invoices/${invoiceId}/pdf`);
  check("Invoice PDF generated", ipdf.pdf === true && ipdf.status === 200, `${ipdf.bytes || 0} bytes`);

  // 10. Approve invoice → ledger debit
  const iappr = await api("POST", `/invoices/${invoiceId}/approve`, {});
  check("Invoice approved", iappr.success, iappr.message);

  // 11. Ledger shows the debit
  const ledger = await api("GET", `/ledgers/${customerId}`);
  check("Ledger fetched", ledger.success);
  check("Ledger outstanding = 1050", Math.round(ledger.data?.summary?.outstandingBalance) === 1050, String(ledger.data?.summary?.outstandingBalance));

  const txs = await api("GET", `/ledgers/${customerId}/transactions`);
  check("Ledger transactions listed", txs.success && txs.data?.length === 1, `${txs.data?.length || 0} txs`);

  // 12. Customer detail with summary
  const cust = await api("GET", `/customers/${customerId}`);
  check("Customer detail + summary", cust.success && cust.data?.summary, JSON.stringify(cust.data?.summary));

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Smoke test crashed:", e.message);
  process.exit(1);
});
