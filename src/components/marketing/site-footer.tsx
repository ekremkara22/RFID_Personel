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
              İş süreçlerini, insanı ve bağlı cihazları tek bir dijital akışta buluşturur.
            </p>
          </div>
          <div>
            <h2>Keşfedin</h2>
            <div className={styles.footerLinks}>
              <Link href="/moduller">Modüller</Link>
              <Link href="/moduller/ik-rfid-personel-takip">İK &amp; RFID</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/iletisim">İletişim</Link>
            </div>
          </div>
          <div>
            <h2>İletişim</h2>
            <address className={styles.contactList}>
              <span><MapPin size={17} /> Şişli / İstanbul</span>
              <a href="tel:+905078368320"><Phone size={17} /> +90 507 836 83 20</a>
              <a href="mailto:ekremkara22@gmail.com"><Mail size={17} /> ekremkara22@gmail.com</a>
            </address>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Flodeska. Tüm hakları saklıdır.</span>
          <span>Flow design. Connected work.</span>
        </div>
      </div>
    </footer>
  );
}
