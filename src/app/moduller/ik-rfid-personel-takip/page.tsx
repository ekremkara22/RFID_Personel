import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleActions } from "@/components/marketing/module-actions";
import { ModuleBuyBar, ModuleSideCard } from "@/components/marketing/module-card";
import { getMarketingModule } from "@/lib/marketing/modules";
import { MODULES } from "@/modules/registry";
import styles from "../../marketing.module.css";

export const metadata: Metadata = { title: "İK & RFID Personel Takip Sistemi", description: "RFID kart okuyucu, PDKS yönetim paneli, giriş-çıkış, mola, izin, puantaj ve cihaz sağlığı özellikleri. 14 gün ücretsiz deneyin.", alternates: { canonical: "/moduller/ik-rfid-personel-takip" } };

export const revalidate = 300;

export default async function RfidModulePage() {
  const hrModule = await getMarketingModule(MODULES.HR);
  return <MarketingShell>
    <div>
      <section className={styles.pageHero}><div className="container">
        <div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / <Link href="/moduller">Modüller</Link> / İK &amp; RFID</div>
        <h1>Personel hareketlerini cihazdan rapora tek akışta yönetin.</h1>
        <p>Sahadaki kart okuyucu, web paneline bağlanır. Giriş, çıkış ve mola kayıtları; izin, çalışma takvimi ve puantajla aynı yerde toplanır.</p>
        <div className={styles.pageHeroActions}><ModuleActions module={hrModule} />{hrModule.priceLabel ? <small>{hrModule.priceLabel}</small> : null}</div>
      </div></section>
      <section className={styles.section}><div className={`container ${styles.contentGrid}`}>
        <article className={styles.prose}>
          <h2>RFID kartlı personel takibi nasıl işler?</h2><p>Personel kartını okuyucuya yaklaştırdığında hareket güvenli bir bağlantıyla merkezi sisteme iletilir. Günün ilk hareketi giriş, aradaki hareketler mola, uygun son hareket çıkış olarak değerlendirilir. Eksik veya tutarsız okutmalar tahmin edilmez; yöneticinin onayına düşer.</p>
          <Image className={styles.productImage} src="/images/marketing/flodeska-operasyon-ozeti-demo.png" alt="Flodeska operasyon özeti ekranı" width={1440} height={900} unoptimized sizes="(max-width: 900px) 100vw, 65vw" />
          <h2>Neler var?</h2><ul><li>RFID kartla temassız giriş, çıkış ve mola kaydı</li><li>Firma, şube ve departman bazında personel yönetimi</li><li>Çalışma takvimi, resmi tatil ve izin talepleri</li><li>Geç kalma, uzun mola ve eksik hareket kontrolleri</li><li>Cihaz bağlantı, sağlık ve yazılım sürümü görünümü</li><li>Aylık puantaj onayı, dönem kilidi, Excel ve PDF dışa aktarım</li><li>Manuel düzeltmelerde kim, ne zaman, neden bilgisini tutan kayıt</li></ul>
          <h2>Kimler için uygun?</h2><p>Fabrika, ofis, şantiye, mağaza ve depo gibi turnike kurmanın gerekmediği ya da mümkün olmadığı yerler. Çok şubeli yapılarda her yönetici yalnız sorumlu olduğu şube ve personeli görür.</p>
          <h2>Kurulum</h2><h3>1. Cihazı yerleştirin</h3><p>Okuyucu firmanıza ve çalışma noktasına eşleştirilir, ağa bağlanır.</p><h3>2. Kartları personele atayın</h3><p>Her kart bir personel kaydına tanımlanır; ilk okutmadan itibaren hareket toplanır.</p><h3>3. Panelden takip edin</h3><p>Günlük durum, hareketler, onay bekleyen kayıtlar ve raporlar tek ekranda.</p>
          <h2>Maaş hesabını da aynı yerde yapın</h2><p>Personelinizin maaşını ve yıllık işveren maliyetini <Link href="/moduller/muhasebe">Muhasebe modülü</Link> ile hesaplayabilirsiniz.</p>
        </article>
        <ModuleSideCard module={hrModule} />
      </div></section>
    </div>
    <ModuleBuyBar module={hrModule} />
  </MarketingShell>;
}
