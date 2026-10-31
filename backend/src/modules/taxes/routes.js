import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { adminOnly, staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";

const router = Router();

const base = z.object({
  name: z.string().trim().min(1),
  ratePercent: z.number().min(0).max(100),
  isActive: z.boolean().optional(),
});

router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  res.json({ data: await prisma.tax.findMany({ orderBy: { id: "asc" } }) });
}));

router.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  const t = await prisma.tax.findUnique({ where: { id: Number(req.params.id) } });
  if (!t) throw new AppError(404, "Tax not found");
  res.json(t);
}));

router.post("/", ...adminOnly, validate(base), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.tax.create({ data: req.body }));
}));

router.put("/:id", ...adminOnly, validate(base.partial()), asyncHandler(async (req, res) => {
  res.json(await prisma.tax.update({ where: { id: Number(req.params.id) }, data: req.body }));
}));

export default router;
