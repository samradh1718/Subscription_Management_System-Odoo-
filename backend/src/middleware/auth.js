import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";

export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new AppError(401, "Not logged in"));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}
