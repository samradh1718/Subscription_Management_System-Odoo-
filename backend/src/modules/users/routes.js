import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/db.js";
import { adminOnly } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";
import { PASSWORD_RULE, PASSWORD_MESSAGE } from "../auth/service.js";

const router = Router();

const staffSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().regex(PASSWORD_RULE, PASSWORD_MESSAGE),
});

const safe = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

// Sirf Admin staff bana sakta hai
router.post("/staff", ...adminOnly, validate(staffSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError(409, "Email already registered");
  }
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email,
      passwordHash: await bcrypt.hash(req.body.password, 10),
      role: "STAFF",
    },
    select: safe,
  });
  res.status(201).json(user);
}));

router.get("/", ...adminOnly, asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = getPaging(req.query);
  const where = req.query.role ? { role: String(req.query.role) } : {};
  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select: safe, skip, take, orderBy: { id: "desc" } }),
    prisma.user.count({ where }),
  ]);
  res.json({ data, meta: pageMeta(page, pageSize, total) });
}));

router.put("/:id/active", ...adminOnly, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new AppError(400, "You cannot deactivate yourself");
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: Boolean(req.body?.isActive) },
    select: safe,
  });
  res.json(user);
}));

export default router;
