import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { todayUTC, addDays, addMonths, addPeriod } from "../../utils/dates.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";
import { priceLines, loadApplicableDiscounts } from "../pricing/pricing.service.js";
import { assertTransition } from "./status.js";

const pad = (n, w = 5) => String(n).padStart(w, "0");

// ---------- helpers ----------

// Raw lines (productId, variantId, quantity) -> priced lines with unitPrice/taxRate
async function resolveLines(client, rawLines, plan) {
  if (!rawLines?.length) throw new AppError(400, "At least one product line is required");

  const ids = [...new Set(rawLines.map((l) => l.productId))];
  const products = await client.product.findMany({
    where: { id: { in: ids } },
    include: { tax: true, variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return rawLines.map((l) => {
    const p = byId.get(l.productId);
    if (!p || !p.isActive) throw new AppError(400, `Product ${l.productId} not found or inactive`);

    let extra = 0;
    if (l.variantId) {
      const v = p.variants.find((x) => x.id === l.variantId);
      if (!v) throw new AppError(400, `Variant ${l.variantId} does not belong to "${p.name}"`);
      extra = v.extraPrice;
    }
    if (l.quantity < plan.minQuantity) {
      throw new AppError(400, `Quantity for "${p.name}" must be at least ${plan.minQuantity} (plan minimum)`);
    }
    const unitPrice = p.salesPrice + extra; // variant price add hota hai
    const taxRate = p.tax && p.tax.isActive ? p.tax.ratePercent : 0;
    return {
      productId: p.id,
      variantId: l.variantId ?? null,
      quantity: l.quantity,
      unitPrice,
      taxRate,
      amount: unitPrice * l.quantity,
    };
  });
}

export async function calcTotals(client, subscriptionId, lines, today = todayUTC()) {
  const discounts = await loadApplicableDiscounts(client, {
    subscriptionId,
    productIds: lines.map((l) => l.productId),
    today,
  });
  const r = priceLines(
    lines.map((l) => ({
      productId: l.productId,
      basePrice: l.unitPrice,
      variantExtra: 0,
      quantity: l.quantity,
      taxRate: l.taxRate,
    })),
    { discounts, today }
  );
  return { subtotal: r.subtotal, discountTotal: r.discountTotal, taxTotal: r.taxTotal, total: r.total };
}

// Discount attach/detach ke baad totals dobara nikalne ke liye
export async function recalcTotals(subscriptionId) {
  const lines = await prisma.subscriptionLine.findMany({ where: { subscriptionId } });
  const totals = await calcTotals(prisma, subscriptionId, lines);
  return prisma.subscription.update({ where: { id: subscriptionId }, data: totals });
}

const detailInclude = {
  customer: { select: { id: true, name: true, email: true } },
  plan: true,
  lines: { include: { product: { select: { id: true, name: true } }, variant: true } },
  history: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { changedAt: "asc" } },
  invoices: {
    select: { id: true, number: true, status: true, total: true, amountDue: true, periodStart: true, periodEnd: true },
    orderBy: { periodStart: "asc" },
  },
  discounts: { include: { discount: true } },
};

// ---------- create / read / update ----------

export async function createSubscription(input, userId) {
  const today = todayUTC();
  let { customerId, planId, startDate, expiryDate, paymentTermsDays, templateId, lines } = input;

  if (templateId) {
    const tpl = await prisma.quotationTemplate.findUnique({ where: { id: templateId }, include: { lines: true } });
    if (!tpl) throw new AppError(404, "Quotation template not found");
    planId ??= tpl.planId;
    if (!lines?.length) {
      lines = tpl.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));
    }
  }
  if (!planId) throw new AppError(400, "planId or templateId is required");

  const [customer, plan] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!customer) throw new AppError(404, "Customer not found");
  if (!plan) throw new AppError(404, "Plan not found");
  if (!plan.isActive) throw new AppError(400, "This plan is not active");
  if ((plan.availableFrom && today < plan.availableFrom) || (plan.availableTo && today > plan.availableTo)) {
    throw new AppError(400, "This plan is not available today");
  }

  startDate ??= today;
  expiryDate ??= addMonths(startDate, 12);
  if (expiryDate <= startDate) throw new AppError(400, "Expiry date must be after start date");

  const resolved = await resolveLines(prisma, lines, plan);
  const totals = await calcTotals(prisma, null, resolved, today);

  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        customerId,
        planId,
        startDate,
        expiryDate,
        paymentTermsDays: paymentTermsDays ?? 15,
        createdById: userId,
        ...totals,
        lines: { create: resolved },
      },
    });
    // number: pehle insert, phir id se banao (duplicate ka chance nahi)
    await tx.subscription.update({ where: { id: sub.id }, data: { number: `SUB-${pad(sub.id)}` } });
    await tx.subscriptionStatusHistory.create({
      data: { subscriptionId: sub.id, fromStatus: null, toStatus: "DRAFT", changedById: userId },
    });
    return tx.subscription.findUnique({ where: { id: sub.id }, include: detailInclude });
  });
}

export async function listSubscriptions(query) {
  const { page, pageSize, skip, take } = getPaging(query);
  const where = {};
  if (query.status) where.status = String(query.status);
  if (query.customerId) where.customerId = Number(query.customerId);
  if (query.planId) where.planId = Number(query.planId);
  if (query.q) where.number = { contains: String(query.q), mode: "insensitive" };

  const [data, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take,
      orderBy: { id: "desc" },
      select: {
        id: true, number: true, status: true, startDate: true, expiryDate: true,
        nextBillingDate: true, total: true,
        customer: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, billingPeriod: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);
  return { data, meta: pageMeta(page, pageSize, total) };
}

export async function getSubscription(id) {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: detailInclude });
  if (!sub) throw new AppError(404, "Subscription not found");
  return sub;
}

export async function updateSubscription(id, input) {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) throw new AppError(404, "Subscription not found");
  if (!["DRAFT", "QUOTATION"].includes(sub.status)) {
    throw new AppError(400, "Subscription can be edited only in DRAFT or QUOTATION status");
  }

  const data = {};
  if (input.startDate) data.startDate = input.startDate;
  if (input.expiryDate) data.expiryDate = input.expiryDate;
  if (input.paymentTermsDays != null) data.paymentTermsDays = input.paymentTermsDays;
  if ((data.expiryDate ?? sub.expiryDate) <= (data.startDate ?? sub.startDate)) {
    throw new AppError(400, "Expiry date must be after start date");
  }

  return prisma.$transaction(async (tx) => {
    let lines = null;
    if (input.lines) {
      lines = await resolveLines(tx, input.lines, sub.plan);
      await tx.subscriptionLine.deleteMany({ where: { subscriptionId: id } });
      await tx.subscriptionLine.createMany({ data: lines.map((l) => ({ ...l, subscriptionId: id })) });
    }
    const current = lines ?? (await tx.subscriptionLine.findMany({ where: { subscriptionId: id } }));
    Object.assign(data, await calcTotals(tx, id, current));
    await tx.subscription.update({ where: { id }, data });
    return tx.subscription.findUnique({ where: { id }, include: detailInclude });
  });
}

// ---------- status machine ----------

export async function changeStatus(id, to, userId, { validityDays = 30, force = false } = {}) {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) throw new AppError(404, "Subscription not found");

  assertTransition(sub.status, to);

  if (!force) {
    if (to === "PAUSED" && !sub.plan.canPause) throw new AppError(400, "This plan cannot be paused");
    if (to === "CLOSED" && ["ACTIVE", "PAUSED"].includes(sub.status) && !sub.plan.canClose) {
      throw new AppError(400, "This plan cannot be closed early");
    }
  }

  const today = todayUTC();
  const data = { status: to };
  if (to === "QUOTATION") data.quoteValidUntil = addDays(today, validityDays);
  if (to === "ACTIVE" && !sub.nextBillingDate) data.nextBillingDate = sub.startDate;

  await prisma.$transaction([
    prisma.subscription.update({ where: { id }, data }),
    prisma.subscriptionStatusHistory.create({
      data: { subscriptionId: id, fromStatus: sub.status, toStatus: to, changedById: userId ?? null },
    }),
  ]);
  return getSubscription(id);
}

export async function renewSubscription(id, userId) {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) throw new AppError(404, "Subscription not found");
  if (!sub.plan.canRenew) throw new AppError(400, "This plan cannot be renewed");
  if (sub.status !== "ACTIVE") throw new AppError(400, "Only ACTIVE subscriptions can be renewed");

  const expiryDate = addPeriod(sub.expiryDate, sub.plan.billingPeriod); // ek term aage
  await prisma.subscription.update({ where: { id }, data: { expiryDate } });
  return getSubscription(id);
}

// ---------- daily jobs (scheduler yahi call karta hai) ----------

// CONFIRMED + start date aa gayi -> ACTIVE
export async function activateDueSubscriptions(today = todayUTC()) {
  const rows = await prisma.subscription.findMany({
    where: { status: "CONFIRMED", startDate: { lte: today } },
    select: { id: true },
  });
  for (const r of rows) await changeStatus(r.id, "ACTIVE", null, { force: true });
  return rows.length;
}

// Quote validity nikal gayi -> CLOSED
export async function closeExpiredQuotes(today = todayUTC()) {
  const rows = await prisma.subscription.findMany({
    where: { status: "QUOTATION", quoteValidUntil: { lt: today } },
    select: { id: true },
  });
  for (const r of rows) await changeStatus(r.id, "CLOSED", null, { force: true });
  return rows.length;
}

// autoClose plan + expiry nikal gayi -> CLOSED (billing ke BAAD chalao)
export async function closeExpiredSubscriptions(today = todayUTC()) {
  const rows = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] }, expiryDate: { lte: today }, plan: { autoClose: true } },
    select: { id: true },
  });
  for (const r of rows) await changeStatus(r.id, "CLOSED", null, { force: true });
  return rows.length;
}
