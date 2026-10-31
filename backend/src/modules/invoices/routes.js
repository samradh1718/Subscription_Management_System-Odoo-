import { Router } from "express";
import { staffUp } from "../../middleware/guards.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listInvoicePayments } from "../payments/service.js";
import * as svc from "./service.js";

const router = Router();
const id = (req) => Number(req.params.id);

router.get("/", ...staffUp, asyncHandler(async (req, res) => res.json(await svc.listInvoices(req.query))));
router.get("/:id", ...staffUp, asyncHandler(async (req, res) => res.json(await svc.getInvoice(id(req)))));
router.post("/:id/confirm", ...staffUp, asyncHandler(async (req, res) => res.json(await svc.confirmInvoice(id(req)))));
router.post("/:id/cancel", ...staffUp, asyncHandler(async (req, res) => res.json(await svc.cancelInvoice(id(req)))));
router.post("/:id/send", ...staffUp, asyncHandler(async (req, res) => res.json(await svc.sendInvoice(id(req)))));
router.get("/:id/payments", ...staffUp, asyncHandler(async (req, res) => {
  res.json({ data: await listInvoicePayments(id(req)) });
}));

export default router;
