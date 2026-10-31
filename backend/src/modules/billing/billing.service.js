import { prisma } from "../../config/db.js";
import { todayUTC, addDays, addPeriod } from "../../utils/dates.js";
import { priceLines, loadApplicableDiscounts } from "../pricing/pricing.service.js";
import { changeStatus } from "../subscriptions/service.js";

const pad = (n, w = 5) => String(n).padStart(w, "0");

// Ek subscription ke ek period ka invoice (ek transaction mein).
// Invoice PEHLE create hota hai: agar (subscriptionId, periodStart) duplicate hai toh
// P2002 turant aata hai aur discount counter ko chhua bhi nahi jaata.
async function createInvoiceForPeriod(sub, periodStart, periodEnd, today) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        subscriptionId: sub.id,
        customerId: sub.customerId,
        status: "CONFIRMED", // billing day pe seedha CONFIRMED (cancel ka option rehta hai)
        invoiceDate: periodStart,
        dueDate: addDays(periodStart, sub.paymentTermsDays),
        periodStart,
        periodEnd,
      },
    });

    const input = sub.lines.map((l) => ({
      productId: l.productId,
      basePrice: l.unitPrice, // unitPrice me variant extra already included hai
      variantExtra: 0,
      quantity: l.quantity,
      taxRate: l.taxRate,
    }));

    let usable = await loadApplicableDiscounts(tx, {
      subscriptionId: sub.id,
      productIds: input.map((l) => l.productId),
      today,
    });

    // Discount usage atomically reserve karo. Limit abhi hi poori hui toh bina us discount ke dobara price karo.
    let priced;
    for (;;) {
      priced = priceLines(input, { discounts: usable, today });
      const reserved = [];
      let failedId = null;
      for (const a of priced.applied) {
        const n = await tx.$executeRaw`
          UPDATE "Discount" SET "usedCount" = "usedCount" + 1
          WHERE id = ${a.discountId} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (n === 0) { failedId = a.discountId; break; }
        reserved.push(a);
      }
      if (failedId === null) break;
      for (const r of reserved) {
        await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = "usedCount" - 1 WHERE id = ${r.discountId}`;
      }
      usable = usable.filter((d) => d.id !== failedId);
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        number: `INV-${periodStart.getUTCFullYear()}-${pad(invoice.id)}`,
        subtotal: priced.subtotal,
        discountTotal: priced.discountTotal,
        taxTotal: priced.taxTotal,
        total: priced.total,
        amountPaid: 0,
        amountDue: priced.total,
      },
    });

    await tx.invoiceLine.createMany({
      data: priced.lines.map((pl, i) => {
        const src = sub.lines[i];
        const variant = src.variant ? ` (${src.variant.attribute}: ${src.variant.value})` : "";
        return {
          invoiceId: invoice.id,
          productId: src.productId,
          description: `${src.product.name}${variant}`,
          quantity: pl.quantity,
          unitPrice: pl.unitPrice,
          discountAmount: pl.discount,
          taxRate: pl.taxRate,
          taxAmount: pl.taxAmount,
          lineTotal: pl.lineTotal,
        };
      }),
    });

    if (priced.applied.length) {
      await tx.discountUsage.createMany({
        data: priced.applied.map((a) => ({ discountId: a.discountId, invoiceId: invoice.id, amount: a.amount })),
      });
    }

    await tx.subscription.update({ where: { id: sub.id }, data: { nextBillingDate: periodEnd } });
    return invoice;
  });
}

export async function runBilling(today = todayUTC()) {
  let created = 0;
  let alreadyBilled = 0;

  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", nextBillingDate: { lte: today } },
    include: { plan: true, lines: { include: { product: true, variant: true } } },
  });

  for (const sub of due) {
    let periodStart = sub.nextBillingDate;

    // Catch-up loop: jitne periods miss hue, sab ke invoices
    while (periodStart <= today && periodStart < sub.expiryDate) {
      const periodEnd = addPeriod(periodStart, sub.plan.billingPeriod);
      try {
        await createInvoiceForPeriod(sub, periodStart, periodEnd, today);
        created++;
      } catch (err) {
        // P2002 = UNIQUE(subscriptionId, periodStart) -> ye period pehle hi bill ho chuka
        if (err.code === "P2002") alreadyBilled++;
        else throw err;
      }
      periodStart = periodEnd;
    }

    if (periodStart.getTime() !== sub.nextBillingDate.getTime()) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { nextBillingDate: periodStart } });
    }

    // autoClose plan aur expiry nikal gayi toh band kar do
    if (sub.plan.autoClose && sub.expiryDate <= today) {
      await changeStatus(sub.id, "CLOSED", null, { force: true });
    }
  }

  const upToDate = await prisma.subscription.count({
    where: { status: "ACTIVE", nextBillingDate: { gt: today } },
  });
  return { created, alreadyBilled, upToDate, subscriptionsProcessed: due.length };
}
