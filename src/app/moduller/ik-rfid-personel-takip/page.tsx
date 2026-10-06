import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import styles from "../../marketing.module.css";

export const metadata: Metadata = { title: "İK & RFID Personel Takip Sistemi", description: "RFID kart okuyucu, PDKS yönetim paneli, giriş-çıkış, mola, izin, puantaj ve cihaz sağlığı özellikleri.", alternates: { canonical: "/moduller/ik-rfid-personel-takip" } };

export default function RfidModulePage() {
  return <MarketingShell>
    <section className={styles.pageHero}><div className="container"><div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / <Link href="/moduller">Modüller</Link> / İK &amp; RFID</div><h1>Personel hareketlerini cihazdan rapora tek akışta yönetin.</h1><p>Flodeska İK &amp; RFID; sahadaki kart okuyucu cihazları web yönetim paneline bağlar, personel hareketlerini anlamlı operasyon verisine dönüştürür.</p></div></section>
    <section className={styles.section}><div className={`container ${styles.contentGrid}`}>
      <article className={styles.prose}>
        <h2>RFID kartlı personel takip sistemi</h2><p>Personel kartını okuyucuya yaklaştırdığında hareket güvenli API üzerinden merkezi sisteme iletilir. İlk hareket giriş, devam eden hareketler mola akışı ve günün uygun son hareketi çıkış olarak değerlendirilir. Eksik veya tutarsız okutmalar tahmin edilmek yerine yöneticinin kontrolüne sunulur.</p>
        <Image className={styles.productImage} src="/images/marketing/flodeska-operasyon-ozeti-demo.png" alt="Flodeska operasyon özeti ekranı" width={1440} height={900} unoptimized sizes="(max-width: 900px) 100vw, 65vw" />
        <h2>Öne çıkan özellikler</h2><ul><li>RFID kart ile hızlı ve temassız giriş, çıkış ve mola kaydı</li><li>Firma, şube ve departman bazlı personel yönetimi</li><li>Çalışma takvimi, izin ve rapor yönetimi</li><li>Geç kalma, mola ve eksik hareket kontrolleri</li><li>Cihaz sağlık, bağlantı ve sürüm görünümü</li><li>Aylık puantaj onayı, dönem kilitleme ve ayrıntılı dışa aktarım</li><li>Manuel düzeltmeler için kullanıcı ve açıklama içeren audit kaydı</li></ul>
        <h2>Kimler için uygun?</h2><p>Fabrika, ofis, şantiye, mağaza, depo ve çok şubeli işletmeler; turnike zorunluluğu olmadan merkezi personel hareket takibi yapabilir. Yetkilendirme yapısı sayesinde her kullanıcı yalnızca sorumlu olduğu firma ve personele erişir.</p>
        <h2>Üç adımda çalışma</h2><h3>1. Cihazı konumlandırın</h3><p>RFID okuyucu ilgili firma ve iş yeriyle eşleştirilir; ağ bağlantısı kurulur.</p><h3>2. Kartları personele atayın</h3><p>Her RFID kartı ilgili personel kaydına tanımlanır ve hareket toplamaya hazır hale gelir.</p><h3>3. Operasyonu panelden yönetin</h3><p>Günlük durum, hareketler, dikkat gerektiren kayıtlar ve raporlar tek panelden izlenir.</p>
      </article>
      <aside className={styles.sideCard}><span className={styles.status}>AKTİF MODÜL</span><h2>İşletmeniz için değerlendirelim</h2><p>Personel sayınızı, çalışma düzeninizi ve cihaz ihtiyacınızı birlikte netleştirelim.</p><Link href="/iletisim" className={styles.textLink}>İletişime geçin <ArrowRight size={18} /></Link></aside>
    </div></section>
  </MarketingShell>;
}
