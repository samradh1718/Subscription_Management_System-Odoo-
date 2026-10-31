import cron from "node-cron";
import { todayUTC } from "../utils/dates.js";
import { runBilling } from "../modules/billing/billing.service.js";
import {
  activateDueSubscriptions,
  closeExpiredQuotes,
  closeExpiredSubscriptions,
} from "../modules/subscriptions/service.js";

// Order important hai: activate -> billing -> close expired
export async function runDailyJobs(today = todayUTC()) {
  const activated = await activateDueSubscriptions(today);
  const billing = await runBilling(today);
  const closedQuotes = await closeExpiredQuotes(today);
  const closedSubs = await closeExpiredSubscriptions(today);
  const summary = { activated, ...billing, closedQuotes, closedSubs };
  console.log("[scheduler] daily jobs done:", summary);
  return summary;
}

export function startScheduler() {
  if (process.env.ENABLE_SCHEDULER === "false") {
    console.log("[scheduler] disabled");
    return;
  }
  // Roz 00:05 pe
  cron.schedule("5 0 * * *", async () => {
    try {
      await runDailyJobs();
    } catch (e) {
      console.error("[scheduler] failed:", e);
    }
  });
  console.log("[scheduler] daily job scheduled at 00:05");
}
