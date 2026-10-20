import bcrypt from "bcryptjs";
import { UserEmailTokenPurpose } from "@/generated/prisma/client";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  accountLink,
  buildPasswordResetEmail,
  buildVerificationEmail,
  generateEmailToken,
  hashEmailToken,
} from "@/lib/account-emails";
import { requiredEnvironmentValue, sendSystemMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { claimPendingLicensesForEmail } from "@/modules/commerce/license-activation";

// One mail per user and purpose per minute keeps resend buttons from flooding an inbox.
const RESEND_COOLDOWN_MS = 60 * 1000;

type MailUser = { id: number; email: string; firstName: string | null; name: string | null };

function displayName(user: MailUser) {
  return user.firstName?.trim() || user.name?.trim() || user.email;
}

async function issueToken(user: MailUser, purpose: UserEmailTokenPurpose, ttlMs: number, now: Date) {
  const recent = await prisma.userEmailToken.findFirst({
    where: { userId: user.id, purpose, usedAt: null, createdAt: { gt: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return null;

  const { token, tokenHash } = generateEmailToken();
  await prisma.$transaction([
    // Only the newest link stays valid.
    prisma.userEmailToken.updateMany({ where: { userId: user.id, purpose, usedAt: null }, data: { usedAt: now } }),
    prisma.userEmailToken.create({ data: { userId: user.id, purpose, tokenHash, expiresAt: new Date(now.getTime() + ttlMs) } }),
  ]);
  return token;
}

/** Atomically marks a valid token as used and returns its owner, or null when expired/used/unknown. */
async function consumeToken(rawToken: string, purpose: UserEmailTokenPurpose, now: Date) {
  if (!rawToken || rawToken.length > 128) return null;
  const tokenHash = hashEmailToken(rawToken);
  const record = await prisma.userEmailToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, purpose: true } });
  if (!record || record.purpose !== purpose) return null;
  const claimed = await prisma.userEmailToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return claimed.count === 1 ? record.userId : null;
}

export async function sendVerificationEmail(user: MailUser, now = new Date()) {
  const token = await issueToken(user, UserEmailTokenPurpose.VERIFY_EMAIL, EMAIL_VERIFICATION_TTL_MS, now);
  if (!token) return;
  const link = accountLink(requiredEnvironmentValue("APP_URL"), "/verify-email", token);
  await sendSystemMail({ to: user.email, ...buildVerificationEmail(displayName(user), link) });
}

/** Silent when the address is unknown or already verified, so the response never reveals accounts. */
export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, name: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return;
  await sendVerificationEmail(user);
}

export async function verifyEmailWithToken(rawToken: string, now = new Date()) {
  const userId = await consumeToken(rawToken, UserEmailTokenPurpose.VERIFY_EMAIL, now);
  if (!userId) return false;
  const user = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: now }, select: { email: true } });
  // Shopier purchases are bound to the address only after its owner proved access to it.
  await claimPendingLicensesForEmail(user.email).catch((error) => console.error("Shopier license claim failed", error instanceof Error ? error.name : "unknown"));
  return true;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, firstName: true, name: true } });
  if (!user) return;
  const token = await issueToken(user, UserEmailTokenPurpose.RESET_PASSWORD, PASSWORD_RESET_TTL_MS, new Date());
  if (!token) return;
  const link = accountLink(requiredEnvironmentValue("APP_URL"), "/reset-password", token);
  await sendSystemMail({ to: user.email, ...buildPasswordResetEmail(displayName(user), link) });
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string, now = new Date()) {
  const userId = await consumeToken(rawToken, UserEmailTokenPurpose.RESET_PASSWORD, now);
  if (!userId) return false;
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true, email: true } });
  await prisma.user.update({
    where: { id: userId },
    // Opening the reset link proves mailbox ownership, so it also verifies the address.
    data: { password: await bcrypt.hash(newPassword, 10), emailVerifiedAt: current?.emailVerifiedAt ?? now },
  });
  if (current && !current.emailVerifiedAt) {
    await claimPendingLicensesForEmail(current.email).catch((error) => console.error("Shopier license claim failed", error instanceof Error ? error.name : "unknown"));
  }
  return true;
}
