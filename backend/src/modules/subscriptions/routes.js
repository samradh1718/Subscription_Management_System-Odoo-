import { Router } from "express";
import { z } from "zod";
import { staffUp } from "../../middleware/guards.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as svc from "./service.js";

const router = Router();

const lineSchema = z.object({
  productId: z.number().int(),
  variantId: z.number().int().optional().nullable(),
  quantity: z.number().int().min(1),
});
const createSchema = z.object({
  customerId: z.number().int(),
  planId: z.number().int().optional(),
  templateId: z.number().int().optional(),
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  lines: z.array(lineSchema).optional(),
});
const updateSchema = z.object({
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  lines: z.array(lineSchema).min(1).optional(),
});
const statusSchema = z.object({
  to: z.enum(["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"]),
  validityDays: z.number().int().min(1).optional(),
});

const id = (req) => Number(req.params.id);

router.post("/", ...staffUp, validate(createSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.createSubscription(req.body, req.user.id));
}));
router.get("/", ...staffUp, asyncHandler(async (req, res) => {
  res.json(await svc.listSubscriptions(req.query));
}));
router.get("/:id", ...staffUp, asyncHandler(async (req, res) => {
  res.json(await svc.getSubscription(id(req)));
}));
router.put("/:id", ...staffUp, validate(updateSchema), asyncHandler(async (req, res) => {
  res.json(await svc.updateSubscription(id(req), req.body));
}));
router.post("/:id/status", ...staffUp, validate(statusSchema), asyncHandler(async (req, res) => {
  res.json(await svc.changeStatus(id(req), req.body.to, req.user.id, { validityDays: req.body.validityDays }));
}));
router.post("/:id/renew", ...staffUp, asyncHandler(async (req, res) => {
  res.json(await svc.renewSubscription(id(req), req.user.id));
}));

export default router;
