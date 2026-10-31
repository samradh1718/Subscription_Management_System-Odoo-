import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { adminOnly, staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { todayUTC, daysBetween } from "../../utils/dates.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";
import { recalcTotals } from "../subscriptions/service.js";

export const discountRoutes = Router(); // mount: /api/discounts
export const subscriptionDiscountRoutes = Router(); // mount: /api/subscriptions

const obj = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["FIXED", "PERCENT"]),
  value: z.number().int().positive(), // PERCENT: 10 | FIXED: paise
  minPurchase: z.number().int().min(0).optional().nullable(),
  minQuantity: z.number().int().min(0).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  usageLimit: z.number().int().positive().optional().nullable(),
  scope: z.enum(["PRODUCT", "SUBSCRIPTION"]),
  isActive: z.boolean().optional(),
  productIds: z.array(z.number().int()).optional(),
});
const createSchema = obj
  .refine((d) => d.endDate >= d.startDate, "End date must be on or after start date")
  .refine((d) => d.type !== "PERCENT" || d.value <= 100, "Percentage cannot exceed 100")
  .refine((d) => d.scope !== "PRODUCT" || d.productIds?.length > 0, "Select at least one product for PRODUCT scope");
const updateSchema = obj.partial();

// UI ke liye "2 / 3 used" aur "Expires in 5 days"
function decorate(d) {
  const today = todayUTC();
  const expired = d.endDate < today;
  const exhausted = d.usageLimit != null && d.usedCount >= d.usageLimit;
  return {
    ...d,
    usageLabel: d.usageLimit != null ? `${d.usedCount} / ${d.usageLimit} used` : `${d.usedCount} used`,
    expired,
    exhausted,
    expiresInDays: expired ? 0 : daysBetween(today, d.endDate),
    productIds: d.products?.map((p) => p.productId),
  };
}
const include = { products: true };

discountRoutes.get("/", ...staffUp, asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = getPaging(req.query);
  const [rows, total] = await Promise.all([
    prisma.discount.findMany({ include, skip, take, orderBy: { id: "desc" } }),
    prisma.discount.count(),
  ]);
  res.json({ data: rows.map(decorate), meta: pageMeta(page, pageSize, total) });
}));

discountRoutes.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  const d = await prisma.discount.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!d) throw new AppError(404, "Discount not found");
  res.json(decorate(d));
}));

// Sirf Admin discount bana/edit kar sakta hai
discountRoutes.post("/", ...adminOnly, validate(createSchema), asyncHandler(async (req, res) => {
  const { productIds, ...data } = req.body;
  const d = await prisma.discount.create({
    data: {
      ...data,
      createdById: req.user.id,
      ...(data.scope === "PRODUCT" ? { products: { create: productIds.map((productId) => ({ productId })) } } : {}),
    },
    include,
  });
  res.status(201).json(decorate(d));
}));

discountRoutes.put("/:id", ...adminOnly, validate(updateSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { productIds, ...data } = req.body;
  const d = await prisma.$transaction(async (tx) => {
    if (productIds) {
      await tx.discountProduct.deleteMany({ where: { discountId: id } });
      await tx.discountProduct.createMany({ data: productIds.map((productId) => ({ discountId: id, productId })) });
    }
    return tx.discount.update({ where: { id }, data, include });
  });
  res.json(decorate(d));
}));

// ---- Subscription ke saath discount attach/detach ----
subscriptionDiscountRoutes.post("/:id/discounts", ...staffUp, asyncHandler(async (req, res) => {
  const subscriptionId = Number(req.params.id);
  const discountId = Number(req.body?.discountId);
  const [sub, discount] = await Promise.all([
    prisma.subscription.findUnique({ where: { id: subscriptionId } }),
    prisma.discount.findUnique({ where: { id: discountId } }),
  ]);
  if (!sub) throw new AppError(404, "Subscription not found");
  if (!discount) throw new AppError(404, "Discount not found");
  if (discount.scope !== "SUBSCRIPTION") throw new AppError(400, "Only SUBSCRIPTION-scope discounts can be attached here");
  if (!discount.isActive) throw new AppError(400, "Discount is not active");

  await prisma.subscriptionDiscount.upsert({
    where: { subscriptionId_discountId: { subscriptionId, discountId } },
    update: {},
    create: { subscriptionId, discountId },
  });
  res.status(201).json(await recalcTotals(subscriptionId));
}));

subscriptionDiscountRoutes.delete("/:id/discounts/:discountId", ...staffUp, asyncHandler(async (req, res) => {
  const subscriptionId = Number(req.params.id);
  await prisma.subscriptionDiscount.deleteMany({
    where: { subscriptionId, discountId: Number(req.params.discountId) },
  });
  res.json(await recalcTotals(subscriptionId));
}));
