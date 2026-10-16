import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BudgetReportPreview } from "@/components/marketing/budget-report-preview";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleActions } from "@/components/marketing/module-actions";
import { ModuleCard } from "@/components/marketing/module-card";
import { ModuleSlider } from "@/components/marketing/module-slider";
import site from "@/components/marketing/site.module.css";
import { blogPosts } from "@/lib/marketing/blog-posts";
import { getMarketingModules } from "@/lib/marketing/modules";
import { MODULES } from "@/modules/registry";
import styles from "./marketing.module.css";

export const metadata: Metadata = {
  title: "RFID Personel Takip, Maaş Hesaplama ve Bütçe Raporu",
  description: "Flodeska ile RFID kartlı personel giriş-çıkış takibini, brütten nete maaş hesabını ve yıllık personel bütçesini tek panelden yönetin. 14 gün ücretsiz deneyin.",
  alternates: { canonical: "/" },
};

// Purchase links come from the module catalog the super admin edits; refresh them periodically.
export const revalidate = 300;

export default async function Home() {
  const modules = await getMarketingModules();
  const hr = modules.find((module) => module.key === MODULES.HR)!;
  const accounting = modules.find((module) => module.key === MODULES.ACCOUNTING)!;
  const organizationJsonLd = {
    "@context": "https://schema.org", "@type": "Organization", name: "Flodeska", url: "https://flodeska.com",
    email: "ekremkara22@gmail.com", telephone: "+905078368320",
    address: { "@type": "PostalAddress", addressLocality: "Şişli", addressRegion: "İstanbul", addressCountry: "TR" },
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

      <section className={site.hero}><div className="container">
        <div className={site.heroCopy}>
          <h1>Personel takibi ve maaş bütçesi, aynı panelde.</h1>
          <div>
            <p>Kartını okutan personelin hareketi panele düşer; ay sonunda maaşı, işveren maliyetini ve yıllık bütçeyi aynı yerden hesaplarsınız. İhtiyacınız olan modülle başlayın.</p>
            <div className={site.heroActions}>
              <Link href="/register" className={site.primaryButton}>14 gün ücretsiz dene</Link>
              <Link href="/moduller" className={site.secondaryButton}>Modülleri incele</Link>
            </div>
            <p className={site.heroNote}>Kart bilgisi istenmez. Deneme süresince tüm modüller açıktır; Muhasebe’de CSV ve PDF aktarımı lisansla açılır.</p>
          </div>
        </div>
        <ModuleSlider slides={[
          {
            id: "hr", tab: "İK & RFID Personel Takip", title: hr.title,
            text: "RFID okuyucudan gelen giriş, çıkış ve mola kayıtları; izin, çalışma takvimi ve puantajla birlikte.",
            visual: <Image src="/images/marketing/flodeska-tanitim-yatay-v1.png" alt="Flodeska RFID kart okuyucu cihazı ve personel takip yönetim paneli" width={1680} height={945} preload unoptimized sizes="(max-width: 1200px) 100vw, 1200px" />,
            actions: <ModuleActions module={hr} />,
          },
          {
            id: "accounting", tab: "Muhasebe · Bütçe Raporu", title: accounting.title,
            text: "24 kişilik örnek firmanın 2026 bütçesi: işveren maliyeti, departman payları ve aylık maliyet dağılımı.",
            visual: <BudgetReportPreview />,
            actions: <ModuleActions module={accounting} />,
          },
        ]} />
      </div></section>

      <section className={styles.section} id="moduller"><div className="container">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.label}>Modüller</span>
            <h2>İhtiyacınız olanı alın, gerisini sonra ekleyin.</h2>
            <p>Modüller aynı firma, kullanıcı ve yetki yapısını kullanır. Muhasebe modülünün kendi personel listesi olduğu için İK modülü olmadan da kullanılabilir.</p>
          </div>
          <Link href="/moduller" className={styles.textLink}>Tüm modüller <ArrowRight size={16} /></Link>
        </div>
        <div className={styles.twoGrid}>{modules.map((module) => <ModuleCard key={module.key} module={module} />)}</div>
        <p className={styles.roadmap}><b>Hazırlanıyor:</b> Üretim Planlama (iş emirleri, kapasite, Gantt)</p>
      </div></section>

      <section className={`${styles.section} ${styles.softSection}`}><div className="container">
        <div className={styles.sectionHead}><div><span className={styles.label}>Nasıl başlanır?</span><h2>Kayıttan lisansa üç adım</h2></div></div>
        <ol className={styles.steps}>
          <li><strong>Hesap açın</strong><span>Firma adınız ve e-posta adresinizle kayıt olun. 14 gün boyunca tüm modüller açık olur.</span></li>
          <li><strong>Kendi verinizle deneyin</strong><span>Personelinizi ekleyin, cihazı bağlayın veya maaş listenizi oluşturun. Satın aldığınızda aynı hesapla devam edersiniz.</span></li>
          <li><strong>Modülü satın alın</strong><span>Shopier üzerinden ödeme yaparken hesap e-postanızı kullanın; ödeme onaylanınca lisans firmanıza tanımlanır.</span></li>
        </ol>
      </div></section>

      <section id="hakkimizda" className={styles.section}><div className={`container ${styles.aboutGrid}`}>
        <div><span className={styles.label}>Hakkımızda</span><h2>Sahadaki veriyi, ofiste kullanılan bilgiye çeviriyoruz.</h2></div>
        <div>
          <p>Flodeska, İstanbul’da geliştirilen bir yönetim panelidir. Kendi tasarladığımız RFID okuyucularla personel hareketini topluyor, bu veriyi puantaj ve bordro hesabında kullanılabilir hale getiriyoruz.</p>
          <p>Her modülü gerçek işletmelerin günlük ihtiyacından yola çıkarak geliştiriyoruz: önce İK ve personel takibi, ardından maaş ve bütçe. Üretim planlama modülü üzerinde çalışıyoruz.</p>
        </div>
      </div></section>

      <section className={`${styles.section} ${styles.softSection}`}><div className="container">
        <div className={styles.sectionHead}><div><span className={styles.label}>Blog</span><h2>Rehberler ve uygulama notları</h2></div><Link href="/blog" className={styles.textLink}>Tüm yazılar <ArrowRight size={16} /></Link></div>
        <div className={styles.threeGrid}>{blogPosts.slice(0, 3).map((post) => <article className={styles.blogCard} key={post.slug}><span>{post.category} · {post.readingTime}</span><h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.description}</p><Link href={`/blog/${post.slug}`} className={styles.textLink}>Yazıyı oku <ArrowRight size={16} /></Link></article>)}</div>
      </div></section>

      <section className={styles.ctaSection}><div className={`container ${styles.ctaInner}`}>
        <div><h2>Kendi verinizle 14 gün deneyin.</h2><p>Sorunuz varsa kurulumu birlikte planlayabiliriz.</p></div>
        <div className={styles.ctaActions}><Link href="/register" className={site.primaryButton}>Ücretsiz dene</Link><Link href="/iletisim" className={site.secondaryButton}>İletişime geçin</Link></div>
      </div></section>
    </MarketingShell>
  );
}
