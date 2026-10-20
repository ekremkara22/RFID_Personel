import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { verifyEmailWithToken } from "@/modules/auth/email-tokens";
import { AuthCard } from "../login/auth-card";
import styles from "../login/page.module.css";

export const metadata = { title: "E-posta doğrulama", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const verified = typeof token === "string" ? await verifyEmailWithToken(token) : false;

  if (verified) {
    return (
      <AuthCard title="E-postanız doğrulandı" subtitle="Hesabınız etkin. Giriş yaparak 14 günlük denemenizi kullanmaya başlayabilirsiniz.">
        <div className={styles.successBox} role="status">
          <CheckCircle2 size={18} />
          <span>E-posta adresiniz başarıyla doğrulandı.</span>
        </div>
        <Link href="/login" className={styles.submitBtn}>Giriş yap</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Doğrulama başarısız" subtitle="Bağlantı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir.">
      <div className={styles.errorBox} role="alert">
        <AlertCircle size={18} />
        <span>Hesabınız zaten doğrulandıysa doğrudan giriş yapabilirsiniz. Değilse giriş ekranında e-posta adresinizi ve şifrenizi girip doğrulama e-postasını yeniden isteyin.</span>
      </div>
      <Link href="/login" className={styles.submitBtn}>Giriş sayfasına git</Link>
    </AuthCard>
  );
}
