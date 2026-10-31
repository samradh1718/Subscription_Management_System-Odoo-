// ============================================================
// PERSON 3 KA FILE. Ye working starter version hai taaki billing chal sake.
// Person 3 isse improve kar sakta hai, lekin SIGNATURE SAME rahe:
//   priceLines(lines, { discounts, today }) -> { lines, subtotal, discountTotal, taxTotal, total, applied }
// Saare amounts paise mein (integer).
// ============================================================

const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

// Discount tabhi lagega jab saari conditions true hon
export function isEligible(d, { subtotal, quantity, today }) {
  return (
    d.isActive &&
    today >= d.startDate &&
    today <= d.endDate &&
    (d.usageLimit == null || d.usedCount < d.usageLimit) &&
    subtotal >= (d.minPurchase ?? 0) &&
    quantity >= (d.minQuantity ?? 0)
  );
}

const discountAmount = (d, base) =>
  d.type === "PERCENT" ? Math.round((base * d.value) / 100) : Math.min(d.value, base);

// total ko items mein weight ke hisaab se baant do (last item ko remainder)
function spread(total, items, weightOf) {
  const totalW = sum(items, weightOf);
  let left = total;
  return items.map((it, i) => {
    const raw = i === items.length - 1 ? left : Math.round((total * weightOf(it)) / totalW);
    const share = Math.min(raw, left);
    left -= share;
    return share;
  });
}

/**
 * lines: [{ productId, basePrice, variantExtra?, quantity, taxRate }]
 * discounts: [{ id, type, value, scope, productIds, minPurchase, minQuantity,
 *               startDate, endDate, usageLimit, usedCount, isActive }]
 */
export function priceLines(lines, { discounts = [], today = new Date() } = {}) {
  const priced = lines.map((l) => {
    const unitPrice = l.basePrice + (l.variantExtra ?? 0);
    return { ...l, unitPrice, gross: unitPrice * l.quantity, discount: 0 };
  });
  const applied = [];

  const apply = (d, targets) => {
    if (!targets.length) return;
    const weightOf = (l) => l.gross - l.discount;
    const base = sum(targets, weightOf);
    const quantity = sum(targets, (l) => l.quantity);
    if (!isEligible(d, { subtotal: base, quantity, today })) return;
    const amount = discountAmount(d, base);
    if (amount <= 0) return;
    const shares = spread(amount, targets, weightOf);
    targets.forEach((l, i) => {
      l.discount = Math.min(l.discount + shares[i], l.gross); // line kabhi negative nahi
    });
    applied.push({ discountId: d.id, amount });
  };

  // 1) product-scope, 2) subscription-scope
  for (const d of discounts.filter((x) => x.scope === "PRODUCT")) {
    apply(d, priced.filter((l) => d.productIds?.includes(l.productId)));
  }
  for (const d of discounts.filter((x) => x.scope === "SUBSCRIPTION")) {
    apply(d, priced);
  }

  // 3) tax discount ke BAAD, per line round
  const out = priced.map((l) => {
    const taxable = l.gross - l.discount;
    const taxAmount = Math.round((taxable * (l.taxRate ?? 0)) / 100);
    return { ...l, taxable, taxAmount, lineTotal: taxable + taxAmount };
  });

  return {
    lines: out,
    subtotal: sum(out, (l) => l.gross),
    discountTotal: sum(out, (l) => l.discount),
    taxTotal: sum(out, (l) => l.taxAmount),
    total: sum(out, (l) => l.lineTotal),
    applied,
  };
}

// Aaj lagne layak discounts DB se nikalta hai (usage limit abhi bhi baaki wale)
export async function loadApplicableDiscounts(client, { subscriptionId, productIds, today }) {
  const or = [{ scope: "PRODUCT", products: { some: { productId: { in: productIds } } } }];
  if (subscriptionId) or.push({ scope: "SUBSCRIPTION", subscriptions: { some: { subscriptionId } } });

  const rows = await client.discount.findMany({
    where: { isActive: true, startDate: { lte: today }, endDate: { gte: today }, OR: or },
    include: { products: true },
  });
  return rows
    .filter((d) => d.usageLimit == null || d.usedCount < d.usageLimit)
    .map((d) => ({ ...d, productIds: d.products.map((p) => p.productId) }));
}
