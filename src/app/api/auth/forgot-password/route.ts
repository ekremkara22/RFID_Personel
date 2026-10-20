import { NextResponse } from "next/server";
import { createIpRateLimiter, normalizedEmail } from "@/lib/ip-rate-limit";
import { requestPasswordReset } from "@/modules/auth/email-tokens";

const isRateLimited = createIpRateLimiter(5, 15 * 60 * 1000);
const GENERIC_MESSAGE = "Bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve istenmeyen klasörünü kontrol edin.";

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const email = normalizedEmail(body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });

  // The answer is identical whether or not the account exists.
  await requestPasswordReset(email).catch((error) => console.error("Password reset mail failed", error instanceof Error ? error.name : "unknown"));
  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
