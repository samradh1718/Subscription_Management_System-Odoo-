import { ZodError } from "zod";

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: err.issues.map((e) => e.message).join(", ") },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Invalid JSON body" } });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: { message: "Already exists" } });
  }
  if (err.code === "P2003") {
    return res.status(409).json({ error: { message: "Record is in use or a related record is missing" } });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: { message: "Record not found" } });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: { message: status === 500 ? "Internal server error" : err.message },
  });
}
