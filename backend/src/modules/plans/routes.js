import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { adminOnly, staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";

const router = Router();

const optDate = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.date().optional());

const base = z.object({
  name: z.string().trim().min(1),
  price: z.number().int().min(0), // paise
  billingPeriod: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  minQuantity: z.number().int().min(1).optional(),
  availableFrom: optDate,
  availableTo: optDate,
  autoClose: z.boolean().optional(),
  canClose: z.boolean().optional(),
  canPause: z.boolean().optional(),
  canRenew: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
const createSchema = base.refine(
  (p) => !p.availableFrom || !p.availableTo || p.availableTo >= p.availableFrom,
  "Available-to date must be after available-from date"
);

router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = getPaging(req.query);
  const where = req.query.active === "true" ? { isActive: true } : {};
  const [data, total] = await Promise.all([
    prisma.plan.findMany({ where, skip, take, orderBy: { id: "desc" } }),
    prisma.plan.count({ where }),
  ]);
  res.json({ data, meta: pageMeta(page, pageSize, total) });
}));

router.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  const p = await prisma.plan.findUnique({ where: { id: Number(req.params.id) } });
  if (!p) throw new AppError(404, "Plan not found");
  res.json(p);
}));

router.post("/", ...adminOnly, validate(createSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.plan.create({ data: req.body }));
}));

router.put("/:id", ...adminOnly, validate(base.partial()), asyncHandler(async (req, res) => {
  res.json(await prisma.plan.update({ where: { id: Number(req.params.id) }, data: req.body }));
}));

export default router;
