import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { sendMail } from "../../utils/mailer.js";

// 9+ characters, uppercase, lowercase, special character
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
export const PASSWORD_MESSAGE =
  "Password must be 9+ characters with an uppercase letter, a lowercase letter and a special character";

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

const publicUser = ({ passwordHash, ...rest }) => rest;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

export async function signup({ name, email, password }) {
  email = email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(password, 10);

  // Public signup hamesha CUSTOMER banata hai + customers row
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { name, email, passwordHash, role: "CUSTOMER" },
    });
    await tx.customer.create({ data: { userId: u.id, name, email } });
    return u;
  });
  return { token: signToken(user), user: publicUser(user) };
}

export async function login({ email, password }) {
  email = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new AppError(401, "Invalid email or password");
  return { token: signToken(user), user: publicUser(user) };
}

export async function me(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");
  return publicUser(user);
}

const GENERIC = { message: "If this email exists, a reset link has been sent" };

export async function forgotPassword({ email }) {
  email = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return GENERIC; // email exist karta hai ya nahi, ye leak nahi karte

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token), // DB mein sirf hash
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const link = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
  console.log("Password reset link (dev):", link);
  try {
    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Hi ${user.name},</p><p>Click <a href="${link}">here</a> to reset your password. This link is valid for 30 minutes.</p>`,
    });
  } catch (e) {
    console.error("Reset email failed (link is in console above):", e.message);
  }
  return GENERIC;
}

export async function resetPassword({ token, password }) {
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) throw new AppError(400, "Reset link is invalid or has expired");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return { message: "Password updated. You can log in now." };
}
