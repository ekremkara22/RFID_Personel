"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, BarChart3, Database, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const panelScopes = [
  {
    title: "Admin girişi",
    description: "Firma, kategori, kullanıcı ve genel PDKS verilerini yönetir.",
    icon: ShieldCheck,
  },
  {
    title: "Firma girişi",
    description: "Personel, QR cihazı, giriş-çıkış kaydı ve rapor ekranlarına odaklanır.",
    icon: Database,
  },
  {
    title: "Raporlama",
    description: "Yoğun kayıt listeleri, filtrelenebilir tablolar ve dışa aktarım akışları için hazırdır.",
    icon: BarChart3,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Giriş başarısız oldu.");
      }

      router.push("/dashboard");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Giriş sırasında bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <motion.section
        className={styles.loginShell}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <div className={styles.formPanel}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Flodeka CheckInQR</p>
            <h1>Yönetim Paneli Girişi</h1>
            <p className={styles.subtitle}>
              Admin ve firma kullanıcıları için yoğun veri yönetimi, kayıt inceleme ve raporlama paneli.
            </p>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={styles.errorBox}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          ) : null}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>E-posta Adresi</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                  type="email"
                  className={styles.input}
                  placeholder="admin@firma.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Şifre</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Panele giriş yap"}
            </button>
          </form>

          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} /> Ana sayfaya dön
          </Link>
        </div>

        <aside className={styles.infoPanel}>
          <div>
            <p className={styles.eyebrow}>Operasyon teması</p>
            <h2>Kayıt, tablo ve rapor odaklı panel</h2>
            <p>
              Bu alan, büyük personel listeleri ve yoğun PDKS hareket verileriyle çalışacak ekipler
              için sade ve okunabilir bir yönetim deneyimi sunar.
            </p>
          </div>

          <div className={styles.scopeList}>
            {panelScopes.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className={styles.scopeItem}>
                  <div className={styles.scopeIcon}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </motion.section>
    </main>
  );
}
