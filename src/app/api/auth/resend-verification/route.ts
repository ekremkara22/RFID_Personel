import { NextResponse } from "next/server";
import { createIpRateLimiter, normalizedEmail } from "@/lib/ip-rate-limit";
import { resendVerificationEmail } from "@/modules/auth/email-tokens";

const isRateLimited = createIpRateLimiter(5, 15 * 60 * 1000);

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const email = normalizedEmail(body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });

  await resendVerificationEmail(email).catch((error) => console.error("Verification mail failed", error instanceof Error ? error.name : "unknown"));
  return NextResponse.json({ success: true, message: "Hesabınız doğrulanmamışsa yeni bir doğrulama bağlantısı gönderildi." });
}
