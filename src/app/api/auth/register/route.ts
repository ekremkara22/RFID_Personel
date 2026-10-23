import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveLicenseKeys, trialEndDate } from "@/lib/module-license-policy";
import { sendRegistrationNotification } from "@/lib/registration-notification";
import { sendVerificationEmail } from "@/modules/auth/email-tokens";
import { provisionOwnedCompany } from "@/modules/companies/provisioning";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;
// Best-effort throttle per process; it limits scripted sign-up bursts without extra infrastructure.
const attemptsByIp = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, now: number) {
  const entry = attemptsByIp.get(ip);
  if (!entry || entry.resetAt <= now) {
    attemptsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (attemptsByIp.size > 5000) {
      for (const [key, value] of attemptsByIp) if (value.resetAt <= now) attemptsByIp.delete(key);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS_PER_WINDOW;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    if (isRateLimited(ip, Date.now())) {
      return NextResponse.json({ error: "Çok fazla kayıt denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const firstName = text(body?.firstName, 100);
    const lastName = text(body?.lastName, 100);
    const companyName = text(body?.companyName, 191);
    const email = text(body?.email, 191).toLowerCase();
    const phone = text(body?.phone, 32);
    const password = typeof body?.password === "string" ? body.password : "";
    // Hidden field humans never fill; bots that complete every input are ignored.
    const website = text(body?.website, 200);

    if (website) return NextResponse.json({ error: "Kayıt tamamlanamadı." }, { status: 400 });
    if (!firstName || !lastName) return NextResponse.json({ error: "Ad ve soyad alanlarını doldurun." }, { status: 400 });
    if (!companyName) return NextResponse.json({ error: "Firma adını girin." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
    if (phone && !/^[0-9+()\s-]{7,32}$/.test(phone)) return NextResponse.json({ error: "Telefon numarası yalnız rakam, boşluk, +, - ve parantez içerebilir." }, { status: 400 });
    if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Şifre en az 10, en fazla 128 karakter olmalıdır." }, { status: 400 });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username: email }] }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresiyle kayıtlı bir hesap var. Giriş yapmayı deneyin." }, { status: 409 });
    }

    const now = new Date();
    const trialEndsAt = trialEndDate(now);
    // The trial opens every module, so the new company starts with the same keys the store flow would give it.
    const moduleKeys = effectiveLicenseKeys({ trialEndsAt, moduleEntitlements: [] }, now);
    const passwordHash = await bcrypt.hash(password, 10);
    // The company is created with the account so the first login lands on a ready panel instead of a separate company form.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim(),
          email,
          phone: phone || null,
          password: passwordHash,
          role: "COMPANY_ADMIN",
          companyId: null,
          selfRegistered: true,
          trialEndsAt,
        },
      });
      const company = await tx.company.create({
        data: { name: companyName, contactName: created.name, contactEmail: email, contactPhone: phone || null },
      });
      await provisionOwnedCompany(tx, { userId: created.id, companyId: company.id, moduleKeys });
      return created;
    });

    // Pending Shopier licenses are claimed once the address is verified (see verifyEmailWithToken).
    // A failed mail never rolls back the registration; the login screen can resend the link.
    await sendVerificationEmail(user).catch((error) => console.error("Verification mail failed", error instanceof Error ? error.name : "unknown"));
    // Notification delivery is best-effort and must never roll back a completed registration.
    await sendRegistrationNotification({
      id: user.id,
      firstName,
      lastName,
      companyName,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      trialEndsAt: user.trialEndsAt,
    }).catch((error) => console.error("Registration notification failed", error instanceof Error ? error.name : "unknown"));
    return NextResponse.json({ success: true, verificationRequired: true, email: user.email }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Bu e-posta adresiyle kayıtlı bir hesap var. Giriş yapmayı deneyin." }, { status: 409 });
    }
    console.error("Register route error", error);
    return NextResponse.json({ error: "Kayıt sırasında beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
