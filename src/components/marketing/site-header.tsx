import Image from "next/image";
import Link from "next/link";
import styles from "./site.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" className={styles.brand} aria-label="Flodeska ana sayfa">
          <Image
            src="/brand/flodeska-logo.png"
            alt="Flodeska"
            width={2172}
            height={724}
            priority
          />
        </Link>
        <nav className={styles.nav} aria-label="Ana menü">
          <Link href="/moduller">Modüller</Link>
          <Link href="/moduller/ik-rfid-personel-takip">İK &amp; RFID</Link>
          <Link href="/moduller/muhasebe">Muhasebe</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/iletisim">İletişim</Link>
        </nav>
        <div className={styles.headerButtons}>
          <Link href="/register" className={styles.trialButton}>
            Ücretsiz dene
          </Link>
          <Link href="/login" className={styles.panelButton}>
            Giriş yap
          </Link>
        </div>
      </div>
    </header>
  );
}
