import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import styles from "../marketing.module.css";

export const metadata: Metadata = { title: "Modüller", description: "Flodeska İK, RFID personel takip, planlama ve iş süreci modüllerini keşfedin.", alternates: { canonical: "/moduller" } };

export default function ModulesPage() {
  return <MarketingShell>
    <section className={styles.pageHero}><div className="container"><div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / Modüller</div><h1>İşletmenizle birlikte büyüyen modüler süreç altyapısı.</h1><p>Her modül aynı kullanıcı, yetki, firma ve raporlama omurgasını paylaşır. İhtiyaç duyduğunuz süreçle başlayıp yapıyı adım adım genişletebilirsiniz.</p></div></section>
    <section className={styles.section}><div className={`container ${styles.moduleGrid}`}>
      <article className={`${styles.moduleCard} ${styles.moduleCardActive}`}><span className={styles.status}>AKTİF</span><h2>İK &amp; RFID Personel Takip</h2><p>RFID kartlı giriş-çıkış, mola, izin, çalışma takvimi, cihaz sağlığı ve puantaj süreçleri.</p><Link href="/moduller/ik-rfid-personel-takip" className={styles.textLink}>Modülü incele <ArrowRight size={18} /></Link></article>
      <article className={styles.moduleCard}><span className={`${styles.status} ${styles.statusMuted}`}>YOL HARİTASI</span><h2>Planlama</h2><p>Üretim ve operasyon planlarının, sorumlulukların ve gerçekleşmelerin ortak akışta yönetilmesi.</p></article>
      <article className={styles.moduleCard}><span className={`${styles.status} ${styles.statusMuted}`}>YOL HARİTASI</span><h2>Muhasebe Süreçleri</h2><p>Operasyon verisini muhasebe iş akışlarıyla ilişkilendiren kontrol ve takip ekranları.</p></article>
      <article className={styles.moduleCard}><span className={`${styles.status} ${styles.statusMuted}`}>YOL HARİTASI</span><h2>IoT &amp; Saha Sistemleri</h2><p>Sensör, okuyucu ve bağlı cihazlardan gelen verinin iş kurallarına dönüştürülmesi.</p></article>
    </div></section>
  </MarketingShell>;
}
