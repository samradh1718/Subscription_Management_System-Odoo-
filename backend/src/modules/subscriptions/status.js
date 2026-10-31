import { AppError } from "../../utils/AppError.js";

export const TRANSITIONS = {
  DRAFT: ["QUOTATION", "CLOSED"],
  QUOTATION: ["CONFIRMED", "CLOSED"],
  CONFIRMED: ["ACTIVE", "CLOSED"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

export function assertTransition(from, to) {
  if (!TRANSITIONS[from]) throw new AppError(400, `Unknown status ${from}`);
  if (!TRANSITIONS[from].includes(to)) {
    throw new AppError(400, `Cannot move subscription from ${from} to ${to}`);
  }
}
