"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import styles from "../login/page.module.css";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? "" : "Bağlantı eksik. Lütfen e-postadaki bağlantıyı kullanın veya yeni bir bağlantı isteyin.");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Şifre güncellenemedi.");
      setDone(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <div className={styles.successBox} role="status">
          <CheckCircle2 size={18} />
          <span>Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</span>
        </div>
        <Link href="/login" className={styles.submitBtn}>Giriş yap</Link>
      </>
    );
  }

  return (
    <>
      {error ? (
        <div className={styles.errorBox} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">Yeni şifre</label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input id="password" type="password" className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="passwordConfirm">Yeni şifre tekrar</label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input id="passwordConfirm" type="password" className={styles.input} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required />
          </div>
        </div>
        <button type="submit" className={styles.submitBtn} disabled={loading || !token}>
          {loading ? "Kaydediliyor..." : "Şifreyi güncelle"}
        </button>
      </form>
      <p className={styles.switchText}>Bağlantının süresi mi doldu? <Link href="/forgot-password">Yeni bağlantı isteyin</Link></p>
    </>
  );
}
