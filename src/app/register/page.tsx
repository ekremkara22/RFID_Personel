"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, BadgeCheck, Boxes, Building2, Lock, Mail, MailCheck, Phone, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import styles from "../login/page.module.css";

const steps = [
  { title: "14 gün ücretsiz deneme", description: "Kayıt olduğunuz anda tüm modüller deneme süresince açılır; kart bilgisi istenmez.", icon: BadgeCheck },
  { title: "Modülleri inceleyin", description: "İK, Üretim Planlama ve Muhasebe modüllerini kendi firmanızla deneyin.", icon: Boxes },
  { title: "İhtiyacınız olanı satın alın", description: "Deneme bitmeden Shopier üzerinden güvenli ödeme ile modül lisansı alın.", icon: ShoppingCart },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", companyName: "", email: "", phone: "", password: "", passwordConfirm: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.passwordConfirm) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, companyName: form.companyName, email: form.email, phone: form.phone, password: form.password, website: form.website }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kayıt tamamlanamadı.");
      setRegisteredEmail(data.email || form.email);
      setLoading(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kayıt sırasında bir hata oluştu.");
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.loginShell}>
        <div className={styles.formPanel}>
          {registeredEmail ? (
            <>
              <div className={styles.header}>
                <p className={styles.eyebrow}>Flodeska</p>
                <h1>E-postanızı doğrulayın</h1>
                <p className={styles.subtitle}>Hesabınız oluşturuldu. Girişten önce e-posta adresinizi doğrulamanız gerekiyor.</p>
              </div>
              <div className={styles.successBox} role="status">
                <MailCheck size={18} />
                <span><strong>{registeredEmail}</strong> adresine bir doğrulama bağlantısı gönderdik. Bağlantı 24 saat geçerlidir; e-postayı göremiyorsanız istenmeyen klasörünü kontrol edin.</span>
              </div>
              <Link href="/login" className={styles.submitBtn}>Giriş sayfasına git</Link>
            </>
          ) : (
            <>
              <div className={styles.header}>
                <p className={styles.eyebrow}>Flodeska</p>
                <h1>Hesap oluşturun</h1>
                <p className={styles.subtitle}>Firmanız için hesap açın, 14 günlük ücretsiz deneme hemen başlasın.</p>
              </div>

              {error ? (
                <div className={styles.errorBox} role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="firstName">Ad</label>
                    <div className={styles.inputWrapper}>
                      <User className={styles.inputIcon} size={18} />
                      <input id="firstName" className={styles.input} value={form.firstName} onChange={update("firstName")} autoComplete="given-name" maxLength={100} required />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lastName">Soyad</label>
                    <div className={styles.inputWrapper}>
                      <User className={styles.inputIcon} size={18} />
                      <input id="lastName" className={styles.input} value={form.lastName} onChange={update("lastName")} autoComplete="family-name" maxLength={100} required />
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="companyName">Firma adı</label>
                  <div className={styles.inputWrapper}>
                    <Building2 className={styles.inputIcon} size={18} />
                    <input id="companyName" className={styles.input} placeholder="Örnek Tekstil Ltd. Şti." value={form.companyName} onChange={update("companyName")} autoComplete="organization" maxLength={191} required />
                  </div>
                  <small className={styles.hint}>Firmanız kayıtla birlikte oluşturulur; bilgileri sonra Firma Tanım ekranından düzenleyebilirsiniz.</small>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="email">E-posta</label>
                  <div className={styles.inputWrapper}>
                    <Mail className={styles.inputIcon} size={18} />
                    <input id="email" type="email" className={styles.input} placeholder="ad.soyad@firma.com" value={form.email} onChange={update("email")} autoComplete="email" required />
                  </div>
                  <small className={styles.hint}>Giriş için ve Shopier siparişinizi hesabınızla eşleştirmek için kullanılır.</small>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="phone">Telefon <span className={styles.optional}>(isteğe bağlı)</span></label>
                  <div className={styles.inputWrapper}>
                    <Phone className={styles.inputIcon} size={18} />
                    <input id="phone" type="tel" className={styles.input} placeholder="05xx xxx xx xx" value={form.phone} onChange={update("phone")} autoComplete="tel" />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="password">Şifre</label>
                    <div className={styles.inputWrapper}>
                      <Lock className={styles.inputIcon} size={18} />
                      <input id="password" type="password" className={styles.input} value={form.password} onChange={update("password")} autoComplete="new-password" minLength={10} maxLength={128} required />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="passwordConfirm">Şifre tekrar</label>
                    <div className={styles.inputWrapper}>
                      <Lock className={styles.inputIcon} size={18} />
                      <input id="passwordConfirm" type="password" className={styles.input} value={form.passwordConfirm} onChange={update("passwordConfirm")} autoComplete="new-password" minLength={10} maxLength={128} required />
                    </div>
                  </div>
                </div>
                <small className={styles.hint}>Şifreniz en az 10 karakter olmalıdır.</small>

                <div className={styles.honeypot} aria-hidden="true">
                  <label htmlFor="website">Web sitesi</label>
                  <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? "Hesap oluşturuluyor..." : "Kayıt ol ve denemeyi başlat"}
                </button>
              </form>

            </>
          )}

          <p className={styles.switchText}>Zaten hesabınız var mı? <Link href="/login">Giriş yapın</Link></p>

          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} /> Ana sayfaya dön
          </Link>
        </div>

        <aside className={styles.infoPanel}>
          <div>
            <p className={styles.eyebrow}>Nasıl çalışır?</p>
            <h2>Deneyin, beğendiğiniz modülü satın alın</h2>
            <p>Deneme süresi sonunda satın alınmayan modüllere erişim kapanır; verileriniz silinmez ve lisans alındığında kaldığınız yerden devam edersiniz.</p>
          </div>
          <div className={styles.scopeList}>
            {steps.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className={styles.scopeItem}>
                  <div className={styles.scopeIcon}><Icon size={18} /></div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}
