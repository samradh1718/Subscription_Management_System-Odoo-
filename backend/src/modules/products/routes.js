import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { adminOnly, staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";

const router = Router();

// Paise mein amount: Rs 1,000 = 100000
const productBase = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["SERVICE", "GOODS", "ADD_ON"]).optional(),
  salesPrice: z.number().int().min(0),
  costPrice: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
  taxId: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});
const variantBase = z.object({
  attribute: z.string().trim().min(1), // Brand
  value: z.string().trim().min(1), // Odoo
  extraPrice: z.number().int().min(0).optional(), // paise
});

const include = { tax: true, variants: true };

router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = getPaging(req.query);
  const q = req.query.q?.toString().trim();
  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(req.query.active === "true" ? { isActive: true } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, include, skip, take, orderBy: { id: "desc" } }),
    prisma.product.count({ where }),
  ]);
  res.json({ data, meta: pageMeta(page, pageSize, total) });
}));

router.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!p) throw new AppError(404, "Product not found");
  res.json(p);
}));

router.post("/", ...adminOnly, validate(productBase), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.product.create({ data: req.body, include }));
}));

router.put("/:id", ...adminOnly, validate(productBase.partial()), asyncHandler(async (req, res) => {
  res.json(await prisma.product.update({ where: { id: Number(req.params.id) }, data: req.body, include }));
}));

// Delete = soft delete (purane subscriptions/invoices na toote)
router.delete("/:id", ...adminOnly, asyncHandler(async (req, res) => {
  await prisma.product.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
  res.json({ message: "Product deactivated" });
}));

// ---- Variants ----
router.get("/:id/variants", ...staffUp, asyncHandler(async (req, res) => {
  res.json({ data: await prisma.productVariant.findMany({ where: { productId: Number(req.params.id) } }) });
}));

router.post("/:id/variants", ...adminOnly, validate(variantBase), asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  if (!(await prisma.product.findUnique({ where: { id: productId } }))) throw new AppError(404, "Product not found");
  res.status(201).json(await prisma.productVariant.create({ data: { ...req.body, productId } }));
}));

router.put("/:id/variants/:variantId", ...adminOnly, validate(variantBase.partial()), asyncHandler(async (req, res) => {
  const v = await prisma.productVariant.findFirst({
    where: { id: Number(req.params.variantId), productId: Number(req.params.id) },
  });
  if (!v) throw new AppError(404, "Variant not found");
  res.json(await prisma.productVariant.update({ where: { id: v.id }, data: req.body }));
}));

router.delete("/:id/variants/:variantId", ...adminOnly, asyncHandler(async (req, res) => {
  const v = await prisma.productVariant.findFirst({
    where: { id: Number(req.params.variantId), productId: Number(req.params.id) },
  });
  if (!v) throw new AppError(404, "Variant not found");
  await prisma.productVariant.delete({ where: { id: v.id } }); // use ho raha ho toh 409
  res.json({ message: "Variant deleted" });
}));

export default router;
