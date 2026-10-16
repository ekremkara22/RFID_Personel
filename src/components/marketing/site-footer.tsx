import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import styles from "./site.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          <div>
            <Link href="/" className={styles.footerBrand}>flodeska</Link>
            <p className={styles.footerText}>
              Personel takibi, bordro ve operasyon verisi için modüler yönetim paneli.
            </p>
          </div>
          <div>
            <h2>Modüller</h2>
            <div className={styles.footerLinks}>
              <Link href="/moduller/ik-rfid-personel-takip">İK &amp; RFID</Link>
              <Link href="/moduller/muhasebe">Muhasebe</Link>
              <Link href="/moduller">Tüm modüller</Link>
            </div>
          </div>
          <div>
            <h2>Flodeska</h2>
            <div className={styles.footerLinks}>
              <Link href="/blog">Blog</Link>
              <Link href="/#hakkimizda">Hakkımızda</Link>
              <Link href="/register">Ücretsiz dene</Link>
            </div>
          </div>
          <div>
            <h2>İletişim</h2>
            <address className={styles.contactList}>
              <span><MapPin size={16} /> Şişli / İstanbul</span>
              <a href="tel:+905078368320"><Phone size={16} /> +90 507 836 83 20</a>
              <a href="mailto:ekremkara22@gmail.com"><Mail size={16} /> ekremkara22@gmail.com</a>
            </address>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Flodeska</span>
          <Link href="/iletisim">Bize yazın</Link>
        </div>
      </div>
    </footer>
  );
}
