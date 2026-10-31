import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";

const router = Router();

const lineSchema = z.object({
  productId: z.number().int(),
  variantId: z.number().int().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
});
const base = z.object({
  name: z.string().trim().min(1),
  planId: z.number().int(),
  validityDays: z.number().int().min(1).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1, "Add at least one product line"),
});

const include = {
  plan: { select: { id: true, name: true, billingPeriod: true } },
  lines: { include: { product: { select: { id: true, name: true } }, variant: true } },
};

router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  res.json({ data: await prisma.quotationTemplate.findMany({ include, orderBy: { id: "desc" } }) });
}));

router.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  const t = await prisma.quotationTemplate.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!t) throw new AppError(404, "Template not found");
  res.json(t);
}));

router.post("/", ...staffUp, validate(base), asyncHandler(async (req, res) => {
  const { lines, ...rest } = req.body;
  const t = await prisma.quotationTemplate.create({
    data: { ...rest, lines: { create: lines } },
    include,
  });
  res.status(201).json(t);
}));

// PUT: lines bheje toh poori lines replace ho jaati hain
router.put("/:id", ...staffUp, validate(base.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { lines, ...rest } = req.body;
  const t = await prisma.$transaction(async (tx) => {
    if (lines) {
      await tx.quotationTemplateLine.deleteMany({ where: { templateId: id } });
      await tx.quotationTemplateLine.createMany({ data: lines.map((l) => ({ ...l, templateId: id })) });
    }
    return tx.quotationTemplate.update({ where: { id }, data: rest, include });
  });
  res.json(t);
}));

router.delete("/:id", ...staffUp, asyncHandler(async (req, res) => {
  await prisma.quotationTemplate.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Template deleted" });
}));

export default router;
