import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { adminOnly, staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";

const router = Router();

const base = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
});

router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = getPaging(req.query);
  const q = req.query.q?.toString().trim();
  const where = q
    ? { OR: ["name", "email", "company"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) }
    : {};
  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy: { id: "desc" } }),
    prisma.customer.count({ where }),
  ]);
  res.json({ data, meta: pageMeta(page, pageSize, total) });
}));

router.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  const c = await prisma.customer.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) throw new AppError(404, "Customer not found");
  res.json(c);
}));

router.post("/", ...staffUp, validate(base), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.customer.create({ data: req.body }));
}));

router.put("/:id", ...staffUp, validate(base.partial()), asyncHandler(async (req, res) => {
  res.json(await prisma.customer.update({ where: { id: Number(req.params.id) }, data: req.body }));
}));

router.delete("/:id", ...adminOnly, asyncHandler(async (req, res) => {
  await prisma.customer.delete({ where: { id: Number(req.params.id) } }); // FK ho toh 409
  res.json({ message: "Customer deleted" });
}));

export default router;
