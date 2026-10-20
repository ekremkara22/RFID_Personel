"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { AuthCard } from "../login/auth-card";
import styles from "../login/page.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "İstek gönderilemedi.");
      setMessage(data.message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Şifremi unuttum" subtitle="Hesabınıza kayıtlı e-posta adresini girin; şifrenizi yenilemeniz için bir bağlantı gönderelim.">
      {error ? (
        <div className={styles.errorBox} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div className={styles.successBox} role="status">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">E-posta</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input id="email" type="email" className={styles.input} placeholder="ad.soyad@firma.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
