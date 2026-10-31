import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";

export async function recordPayment({ invoiceId, amount, method, paymentDate, note }, userId) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new AppError(404, "Invoice not found");
    if (inv.status !== "CONFIRMED") throw new AppError(400, "Only confirmed invoices can receive payments");
    if (amount <= 0 || amount > inv.amountDue) {
      throw new AppError(400, `Amount must be between 1 and the amount due (${inv.amountDue} paise)`);
    }

    await tx.payment.create({
      data: { invoiceId, amount, method, paymentDate: paymentDate ?? new Date(), note, recordedById: userId },
    });

    const amountPaid = inv.amountPaid + amount;
    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid,
        amountDue: inv.total - amountPaid,
        status: amountPaid >= inv.total ? "PAID" : "CONFIRMED", // full payment -> PAID
      },
    });
  });
}

export async function listPayments(query) {
  const { page, pageSize, skip, take } = getPaging(query);
  const where = {};
  if (query.method) where.method = String(query.method);
  if (query.invoiceId) where.invoiceId = Number(query.invoiceId);
  if (query.from || query.to) {
    where.paymentDate = {};
    if (query.from) where.paymentDate.gte = new Date(String(query.from));
    if (query.to) where.paymentDate.lte = new Date(String(query.to));
  }
  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { paymentDate: "desc" },
      include: { invoice: { select: { id: true, number: true, customer: { select: { id: true, name: true } } } } },
    }),
    prisma.payment.count({ where }),
  ]);
  return { data, meta: pageMeta(page, pageSize, total) };
}

export const listInvoicePayments = (invoiceId) =>
  prisma.payment.findMany({ where: { invoiceId }, orderBy: { paymentDate: "asc" } });
