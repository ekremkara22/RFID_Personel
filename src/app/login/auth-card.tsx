import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

/** Single-column card shared by e-mail verification and password reset screens. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className={styles.container}>
      <section className={`${styles.loginShell} ${styles.singleShell}`}>
        <div className={styles.formPanel}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Flodeska</p>
            <h1>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          {children}
          <Link href="/login" className={styles.backLink}>
            <ArrowLeft size={16} /> Giriş sayfasına dön
          </Link>
        </div>
      </section>
    </main>
  );
}
