import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { todayUTC, daysBetween } from "../../utils/dates.js";
import { getPaging, pageMeta } from "../../utils/paginate.js";
import { sendMail } from "../../utils/mailer.js";

// Overdue stored status nahi hai, hamesha calculate hota hai
export function withOverdue(inv, today = todayUTC()) {
  const isOverdue = inv.status === "CONFIRMED" && inv.dueDate < today && inv.amountDue > 0;
  return { ...inv, isOverdue, daysOverdue: isOverdue ? daysBetween(inv.dueDate, today) : 0 };
}

const listSelect = {
  id: true, number: true, status: true, invoiceDate: true, dueDate: true, periodStart: true, periodEnd: true,
  total: true, amountPaid: true, amountDue: true, sentAt: true,
  customer: { select: { id: true, name: true } },
  subscription: { select: { id: true, number: true } },
};

export async function listInvoices(query) {
  const { page, pageSize, skip, take } = getPaging(query);
  const today = todayUTC();
  const where = {};
  if (query.status) where.status = String(query.status);
  if (query.customerId) where.customerId = Number(query.customerId);
  if (query.subscriptionId) where.subscriptionId = Number(query.subscriptionId);
  if (query.overdue === "true") {
    where.status = "CONFIRMED";
    where.dueDate = { lt: today };
    where.amountDue = { gt: 0 };
  }
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({ where, select: listSelect, skip, take, orderBy: { id: "desc" } }),
    prisma.invoice.count({ where }),
  ]);
  return { data: rows.map((r) => withOverdue(r, today)), meta: pageMeta(page, pageSize, total) };
}

export const invoiceDetailInclude = {
  customer: true,
  subscription: { select: { id: true, number: true, paymentTermsDays: true } },
  lines: true,
  payments: { orderBy: { paymentDate: "asc" } },
};

export async function getInvoice(id) {
  const inv = await prisma.invoice.findUnique({ where: { id }, include: invoiceDetailInclude });
  if (!inv) throw new AppError(404, "Invoice not found");
  return withOverdue(inv);
}

export async function confirmInvoice(id) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw new AppError(404, "Invoice not found");
  if (inv.status !== "DRAFT") throw new AppError(400, `Only DRAFT invoices can be confirmed (current: ${inv.status})`);
  await prisma.invoice.update({ where: { id }, data: { status: "CONFIRMED", amountDue: inv.total - inv.amountPaid } });
  return getInvoice(id);
}

export async function cancelInvoice(id) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw new AppError(404, "Invoice not found");
  if (!["DRAFT", "CONFIRMED"].includes(inv.status)) {
    throw new AppError(400, `A ${inv.status} invoice cannot be cancelled`);
  }
  if (inv.amountPaid > 0) throw new AppError(400, "Invoice has payments and cannot be cancelled");

  await prisma.$transaction(async (tx) => {
    // discount ki use wapas karo (usage count -1, usage row delete)
    const usages = await tx.discountUsage.findMany({ where: { invoiceId: id } });
    for (const u of usages) {
      await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE id = ${u.discountId}`;
    }
    await tx.discountUsage.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({ where: { id }, data: { status: "CANCELLED", amountDue: 0 } });
  });
  return getInvoice(id);
}

const inr = (paise) => `Rs ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmt = (d) => d.toISOString().slice(0, 10);

export async function sendInvoice(id) {
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { customer: true, lines: true } });
  if (!inv) throw new AppError(404, "Invoice not found");
  if (!["CONFIRMED", "PAID"].includes(inv.status)) {
    throw new AppError(400, "Only confirmed invoices can be sent");
  }

  const rows = inv.lines
    .map((l) => `<tr><td>${l.description}</td><td>${l.quantity}</td><td>${inr(l.lineTotal)}</td></tr>`)
    .join("");
  const html = `
    <h2>Invoice ${inv.number}</h2>
    <p>Hi ${inv.customer.name}, here is your invoice for ${fmt(inv.periodStart)} to ${fmt(inv.periodEnd)}.</p>
    <table border="1" cellpadding="6" cellspacing="0"><tr><th>Item</th><th>Qty</th><th>Amount</th></tr>${rows}</table>
    <p><b>Total: ${inr(inv.total)}</b> | Due: ${inr(inv.amountDue)} | Due date: ${fmt(inv.dueDate)}</p>`;

  let previewUrl = null;
  try {
    previewUrl = await sendMail({ to: inv.customer.email, subject: `Invoice ${inv.number}`, html });
  } catch (e) {
    throw new AppError(502, `Could not send email: ${e.message}`);
  }
  await prisma.invoice.update({ where: { id }, data: { sentAt: new Date() } });
  return { message: "Invoice sent", previewUrl, invoice: await getInvoice(id) };
}
