import { Router } from "express";
import { z } from "zod";
import { staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as svc from "./service.js";

const router = Router();

const paymentSchema = z.object({
  invoiceId: z.number().int(),
  amount: z.number().int().positive("Amount must be greater than 0"), // paise
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "UPI", "CHEQUE"]),
  paymentDate: z.coerce.date().optional(),
  note: z.string().optional().nullable(),
});

router.post("/", ...staffUp, validate(paymentSchema), asyncHandler(async (req, res) => {
  const invoice = await svc.recordPayment(req.body, req.user.id);
  res.status(201).json(invoice);
}));

router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  res.json(await svc.listPayments(req.query));
}));

export default router;
