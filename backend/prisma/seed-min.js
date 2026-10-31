// Chhota seed sirf tumhari testing ke liye (Person 3 ka asli seed.js alag hoga).
// Run: npm run seed:min
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function user(name, email, password, role) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

async function main() {
  await user("Admin", "admin@brightloop.com", "Admin@1234", "ADMIN");
  await user("Staff", "staff@brightloop.com", "Staff@1234", "STAFF");
  const cu = await user("Demo Customer", "customer@brightloop.com", "Customer@1234", "CUSTOMER");

  await prisma.customer.upsert({
    where: { userId: cu.id },
    update: {},
    create: { userId: cu.id, name: "Demo Customer", email: cu.email },
  });

  if ((await prisma.tax.count()) === 0) {
    const gst = await prisma.tax.create({ data: { name: "GST 18%", ratePercent: 18 } });
    const product = await prisma.product.create({
      data: { name: "CRM Software", type: "SERVICE", salesPrice: 100000, costPrice: 40000, taxId: gst.id },
    });
    await prisma.productVariant.create({
      data: { productId: product.id, attribute: "Brand", value: "Odoo", extraPrice: 56000 },
    });
    const plan = await prisma.plan.create({
      data: { name: "Monthly Basic", price: 100000, billingPeriod: "MONTHLY", minQuantity: 1 },
    });
    await prisma.quotationTemplate.create({
      data: {
        name: "CRM Monthly Quote",
        planId: plan.id,
        validityDays: 30,
        lines: { create: [{ productId: product.id, quantity: 1 }] },
      },
    });
  }
  console.log("Seed done. Logins: admin@brightloop.com / Admin@1234, staff@brightloop.com / Staff@1234, customer@brightloop.com / Customer@1234");
}

main().finally(() => prisma.$disconnect());
