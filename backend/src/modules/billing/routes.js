import { Router } from "express";
import { staffUp } from "../../middleware/guards.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { todayUTC } from "../../utils/dates.js";
import { runBilling } from "./billing.service.js";

const router = Router();

// POST /api/billing/run  ->  { created, alreadyBilled, upToDate }
// Testing ke liye (sirf non-production): body { "asOf": "2026-12-15" } se future date simulate kar sakte ho
router.post("/run", ...staffUp, asyncHandler(async (req, res) => {
  let today = todayUTC();
  if (process.env.NODE_ENV !== "production" && req.body?.asOf) {
    const d = new Date(req.body.asOf);
    if (!Number.isNaN(d.getTime())) today = d;
  }
  const t0 = Date.now();
  const result = await runBilling(today);
  res.json({ ...result, ranAsOf: today, tookMs: Date.now() - t0 });
}));

export default router;
