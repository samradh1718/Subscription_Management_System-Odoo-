import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./modules/auth/routes.js";
import userRoutes from "./modules/users/routes.js";
import customerRoutes from "./modules/customers/routes.js";
import taxRoutes from "./modules/taxes/routes.js";
import productRoutes from "./modules/products/routes.js";
import planRoutes from "./modules/plans/routes.js";
import templateRoutes from "./modules/templates/routes.js";
import subscriptionRoutes from "./modules/subscriptions/routes.js";
import billingRoutes from "./modules/billing/routes.js";
import invoiceRoutes from "./modules/invoices/routes.js";
import paymentRoutes from "./modules/payments/routes.js";
import { discountRoutes, subscriptionDiscountRoutes } from "./modules/discounts/routes.js";
import portalRoutes from "./modules/portal/routes.js";

const app = express();
app.use(cors());
app.use(express.json());

// Response time logger (2-second requirement ka proof)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)} ms`);
  });
  next();
});

app.get("/", (req, res) => res.json({ message: "Subscription Management API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/taxes", taxRoutes);
app.use("/api/products", productRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/quotation-templates", templateRoutes);
app.use("/api/subscriptions", subscriptionDiscountRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/portal", portalRoutes);

app.use((req, res) => res.status(404).json({ error: { message: "Route not found" } }));
app.use(errorHandler); // hamesha last

export default app;
