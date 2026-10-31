import { Router } from "express";
import { prisma } from "../../config/db.js";
import { customerOnly } from "../../middleware/guards.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";
import { withOverdue, invoiceDetailInclude } from "../invoices/service.js";

const router = Router();

// Har query logged-in customer se scope hoti hai. URL ki id pe kabhi bharosa nahi.
async function currentCustomer(req) {
  const c = await prisma.customer.findUnique({ where: { userId: req.user.id } });
  if (!c) throw new AppError(404, "Customer profile not found");
  return c;
}

router.get("/subscriptions", ...customerOnly, asyncHandler(async (req, res) => {
  const c = await currentCustomer(req);
  const { page, pageSize, skip, take } = getPaging(req.query);
  const where = { customerId: c.id };
  const [data, total] = await Promise.all([
    prisma.subscription.findMany({
      where, skip, take, orderBy: { id: "desc" },
      select: {
        id: true, number: true, status: true, startDate: true, expiryDate: true, nextBillingDate: true, total: true,
        plan: { select: { id: true, name: true, billingPeriod: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);
  res.json({ data, meta: pageMeta(page, pageSize, total) });
}));

router.get("/subscriptions/:id", ...customerOnly, asyncHandler(async (req, res) => {
  const c = await currentCustomer(req);
  const sub = await prisma.subscription.findFirst({
    where: { id: Number(req.params.id), customerId: c.id },
    include: { plan: true, lines: { include: { product: { select: { name: true } }, variant: true } } },
  });
  if (!sub) throw new AppError(404, "Subscription not found");
  res.json(sub);
}));

router.get("/invoices", ...customerOnly, asyncHandler(async (req, res) => {
  const c = await currentCustomer(req);
  const { page, pageSize, skip, take } = getPaging(req.query);
  const where = { customerId: c.id, status: { not: "DRAFT" } };
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take, orderBy: { id: "desc" },
      select: {
        id: true, number: true, status: true, invoiceDate: true, dueDate: true,
        total: true, amountPaid: true, amountDue: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ data: rows.map((r) => withOverdue(r)), meta: pageMeta(page, pageSize, total) });
}));

router.get("/invoices/:id", ...customerOnly, asyncHandler(async (req, res) => {
  const c = await currentCustomer(req);
  const inv = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), customerId: c.id }, // doosre ki invoice -> 404
    include: invoiceDetailInclude,
  });
  if (!inv) throw new AppError(404, "Invoice not found");
  res.json(withOverdue(inv));
}));

export default router;
