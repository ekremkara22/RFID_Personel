import { NextResponse } from "next/server";
import { createIpRateLimiter } from "@/lib/ip-rate-limit";
import { resetPasswordWithToken } from "@/modules/auth/email-tokens";

const isRateLimited = createIpRateLimiter(10, 15 * 60 * 1000);

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Şifre en az 10, en fazla 128 karakter olmalıdır." }, { status: 400 });

  try {
    const changed = await resetPasswordWithToken(token, password);
    if (!changed) {
      return NextResponse.json({ error: "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir şifre sıfırlama bağlantısı isteyin." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password route error", error);
    return NextResponse.json({ error: "Şifre güncellenirken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
