import { AuthCard } from "../login/auth-card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Yeni şifre belirle", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Yeni şifre belirleyin" subtitle="Hesabınız için yeni bir şifre girin. Şifreniz en az 10 karakter olmalıdır.">
      <ResetPasswordForm token={typeof token === "string" ? token : ""} />
    </AuthCard>
  );
}
