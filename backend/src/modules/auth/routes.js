import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { anyUser } from "../../middleware/guards.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as svc from "./service.js";

const router = Router();

const passwordField = z.string().regex(svc.PASSWORD_RULE, svc.PASSWORD_MESSAGE);

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: passwordField,
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(10), password: passwordField });

router.post("/signup", validate(signupSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.signup(req.body));
}));
router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  res.json(await svc.login(req.body));
}));
router.get("/me", ...anyUser, asyncHandler(async (req, res) => {
  res.json(await svc.me(req.user.id));
}));
router.post("/forgot-password", validate(forgotSchema), asyncHandler(async (req, res) => {
  res.json(await svc.forgotPassword(req.body));
}));
router.post("/reset-password", validate(resetSchema), asyncHandler(async (req, res) => {
  res.json(await svc.resetPassword(req.body));
}));

export default router;
