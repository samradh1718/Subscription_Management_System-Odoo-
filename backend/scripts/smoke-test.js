// End-to-end check. Pehle: migrate + seed:min + server chalu (npm run dev), phir: npm run smoke
// Admin/Staff/Customer logins seed-min.js se aate hain.
const BASE = process.env.API_URL || "http://localhost:5000/api";
let pass = 0, fail = 0;

async function call(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra); }
}
const login = async (email, password) => (await call("POST", "/auth/login", { email, password })).body.token;
const iso = (d) => d.toISOString().slice(0, 10);

const admin = await login("admin@brightloop.com", "Admin@1234");
const staff = await login("staff@brightloop.com", "Staff@1234");
const cust = await login("customer@brightloop.com", "Customer@1234");

// 1 Auth rules
let r = await call("POST", "/auth/signup", { name: "T", email: `t${Date.now()}@x.com`, password: "abc12345" });
check("weak password rejected", r.status === 400);
const email = `t${Date.now()}@x.com`;
r = await call("POST", "/auth/signup", { name: "T", email, password: "Abcdefg@1" });
check("strong password signup ok", r.status === 201);
r = await call("POST", "/auth/signup", { name: "T", email, password: "Abcdefg@1" });
check("duplicate email rejected (409)", r.status === 409);
r = await call("POST", "/users/staff", { name: "S", email: "s@x.com", password: "Abcdefg@1" }, staff);
check("staff cannot create staff (403)", r.status === 403);
r = await call("GET", "/products", null, cust);
check("customer blocked from admin API (403)", r.status === 403);

// 2 Catalog
const tax = (await call("POST", "/taxes", { name: "GST 18%", ratePercent: 18 }, admin)).body;
const product = (await call("POST", "/products", { name: `Smoke Product ${Date.now()}`, salesPrice: 100000, taxId: tax.id }, admin)).body;
const variant = (await call("POST", `/products/${product.id}/variants`, { attribute: "Brand", value: "Odoo", extraPrice: 56000 }, admin)).body;
const plan = (await call("POST", "/plans", { name: "Smoke Monthly", price: 100000, billingPeriod: "MONTHLY", minQuantity: 2 }, admin)).body;
check("product + variant + plan created", product.id && variant.id && plan.id);

// 3 Discount (10%, min qty 5, limit 2)
const today = new Date();
const discount = (await call("POST", "/discounts", {
  name: "Smoke 10%", type: "PERCENT", value: 10, minQuantity: 5, usageLimit: 2, scope: "PRODUCT",
  productIds: [product.id], startDate: "2026-01-01", endDate: "2030-12-31",
}, admin)).body;
check("discount shows 0 / 2 used", discount.usageLabel === "0 / 2 used", JSON.stringify(discount));

// 4 Subscription
const customer = (await call("POST", "/customers", { name: "Smoke Cust", email: `c${Date.now()}@x.com` }, staff)).body;
r = await call("POST", "/subscriptions", { customerId: customer.id, planId: plan.id, lines: [{ productId: product.id, variantId: variant.id, quantity: 1 }] }, staff);
check("qty below plan minimum rejected", r.status === 400, JSON.stringify(r.body));

const start = new Date(); start.setUTCMonth(start.getUTCMonth() - 3); // 3 mahine peeche se shuru
r = await call("POST", "/subscriptions", {
  customerId: customer.id, planId: plan.id, startDate: iso(start), expiryDate: "2030-01-01",
  lines: [{ productId: product.id, variantId: variant.id, quantity: 5 }],
}, staff);
const sub = r.body;
check("subscription created (SUB-xxxxx)", r.status === 201 && /^SUB-/.test(sub.number), JSON.stringify(r.body));
// 5 x (1000 + 560) = 7800 -> 10% off = 780 -> taxable 7020 -> +18% = 8283.60
check("subscription total correct (828360 paise)", sub.total === 828360, `got ${sub.total}`);

r = await call("POST", `/subscriptions/${sub.id}/status`, { to: "ACTIVE" }, staff);
check("illegal jump DRAFT -> ACTIVE rejected", r.status === 400);
for (const to of ["QUOTATION", "CONFIRMED", "ACTIVE"]) {
  r = await call("POST", `/subscriptions/${sub.id}/status`, { to }, staff);
  check(`status -> ${to}`, r.status === 200 && r.body.status === to, JSON.stringify(r.body));
}
r = await call("POST", `/subscriptions/${sub.id}/status`, { to: "DRAFT" }, staff);
check("ACTIVE -> DRAFT rejected", r.status === 400);

// 6 Billing: catch-up + idempotency
r = await call("POST", "/billing/run", {}, staff);
check("billing creates 4 invoices (3 months back + current)", r.body.created >= 4, JSON.stringify(r.body));
r = await call("POST", "/billing/run", {}, staff);
check("second run creates 0 invoices", r.body.created === 0, JSON.stringify(r.body));

const invs = (await call("GET", `/invoices?customerId=${customer.id}`, null, staff)).body.data;
check("4 invoices exist for subscription", invs.length >= 4, `got ${invs.length}`);
const sorted = [...invs].sort((a, b) => a.id - b.id);
check("1st invoice has discount", sorted[0].total === 828360, `got ${sorted[0].total}`);
check("3rd invoice has NO discount (limit 2 reached): 7800 + 18% = 920400", sorted[2].total === 920400, `got ${sorted[2].total}`);
const d2 = (await call("GET", `/discounts/${discount.id}`, null, admin)).body;
check("discount shows 2 / 2 used", d2.usageLabel === "2 / 2 used", d2.usageLabel);

// 7 Payments
const inv = sorted[0];
r = await call("POST", "/payments", { invoiceId: inv.id, amount: 300000, method: "UPI" }, staff);
check("partial payment keeps CONFIRMED", r.status === 201 && r.body.status === "CONFIRMED", JSON.stringify(r.body));
r = await call("POST", "/payments", { invoiceId: inv.id, amount: 99999999, method: "CASH" }, staff);
check("overpayment rejected", r.status === 400);
r = await call("POST", "/payments", { invoiceId: inv.id, amount: inv.total - 300000, method: "CASH" }, staff);
check("full payment -> PAID", r.status === 201 && r.body.status === "PAID", JSON.stringify(r.body));

// 8 Overdue + portal isolation
const od = (await call("GET", "/invoices?overdue=true", null, staff)).body;
check("overdue list works", Array.isArray(od.data));
r = await call("GET", `/portal/invoices/${inv.id}`, null, cust);
check("customer cannot read another customer's invoice (404)", r.status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
