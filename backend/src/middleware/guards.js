import { auth } from "./auth.js";
import { requireRole } from "./requireRole.js";

// Route mein spread karke use karo: router.get("/", ...staffUp, handler)
export const anyUser = [auth];
export const adminOnly = [auth, requireRole("ADMIN")];
export const staffUp = [auth, requireRole("ADMIN", "STAFF")];
export const customerOnly = [auth, requireRole("CUSTOMER")];
