import type { Metadata } from "next";
import { ArrowRight, Boxes, Cpu, LineChart, Network, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleSlider } from "@/components/marketing/module-slider";
import { blogPosts } from "@/lib/marketing/blog-posts";
import styles from "./marketing.module.css";

export const metadata: Metadata = {
  title: "İş Süreçleri, IoT ve Dijital Operasyon Platformu",
  description: "Flodeska; İK, RFID personel takibi, planlama ve bağlı cihaz süreçlerini tek dijital operasyon platformunda buluşturur.",
  alternates: { canonical: "/" },
};

const capabilities = [
  { icon: Workflow, title: "Süreç odaklı", text: "Dağınık iş adımlarını ölçülebilir, izlenebilir ve standart akışlara dönüştürür." },
  { icon: Cpu, title: "IoT ile bağlantılı", text: "Sahadaki cihazlardan gelen veriyi operasyon kararlarına bağlar." },
  { icon: LineChart, title: "Veriyle görünür", text: "Anlık durum, geçmiş kayıt ve raporları karar alınabilir biçimde sunar." },
];

export default function Home() {
  const organizationJsonLd = {
    "@context": "https://schema.org", "@type": "Organization", name: "Flodeska", url: "https://flodeska.com",
    email: "ekremkara22@gmail.com", telephone: "+905078368320",
    address: { "@type": "PostalAddress", addressLocality: "Şişli", addressRegion: "İstanbul", addressCountry: "TR" },
  };
  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <div className="container"><ModuleSlider /></div>
      <section className={styles.section}><div className="container">
        <div className={styles.sectionIntro}><span>FLODESKA YAKLAŞIMI</span><h2>Sadece bir yazılım değil, işletmenin dijital çalışma katmanı.</h2><p>İnsan, süreç ve cihaz verisini aynı yerde birleştirerek operasyonunuzu daha görünür ve yönetilebilir hale getiriyoruz.</p></div>
        <div className={styles.threeGrid}>{capabilities.map(({ icon: Icon, title, text }) => <article className={styles.card} key={title}><div className={styles.iconBox}><Icon size={23} /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>
      <section className={`${styles.section} ${styles.softSection}`}><div className={`container ${styles.moduleFeature}`}>
        <div><span className={styles.kicker}>İLK AKTİF MODÜL</span><h2>İK &amp; RFID Personel Takip</h2><p>Personel giriş, çıkış ve mola hareketlerini sahadaki RFID cihazından yönetim paneline taşır. Şube, departman, izin, çalışma takvimi ve puantaj süreçlerini tek yerde izlenebilir hale getirir.</p><Link href="/moduller/ik-rfid-personel-takip" className={styles.textLink}>Tüm özellikleri incele <ArrowRight size={18} /></Link></div>
        <div className={styles.featureList}><span><ShieldCheck size={20} /> Yetki ve firma kapsamı kontrolleri</span><span><Network size={20} /> RFID cihaz sağlığı ve bağlantı takibi</span><span><Boxes size={20} /> Modüler büyümeye hazır yapı</span></div>
      </div></section>
      <section id="hakkimizda" className={styles.section}><div className={`container ${styles.storyGrid}`}><div className={styles.storyMark}>f<span>·</span>k</div><div><span className={styles.kicker}>İSMİN HİKÂYESİ</span><h2>Flow design ile Kara’nın birleşimi.</h2><p><strong>Flodeska</strong>, süreçleri tasarlama yaklaşımını anlatan “flow design” fikriyle kurucusu Ekrem Kara’nın soyadından doğdu. Bu nedenle odağımız yalnızca ekran üretmek değil; işletmenin gerçek çalışma biçimini daha akıcı, bağlantılı ve ölçülebilir hale getirmek.</p></div></div></section>
      <section className={styles.section}><div className="container">
        <div className={styles.sectionRow}><div className={styles.sectionIntroLeft}><span>BİLGİ MERKEZİ</span><h2>İş süreçleri ve dijitalleşme notları</h2></div><Link href="/blog" className={styles.textLink}>Tüm yazılar <ArrowRight size={18} /></Link></div>
        <div className={styles.threeGrid}>{blogPosts.map((post) => <article className={styles.blogCard} key={post.slug}><span>{post.category} · {post.readingTime}</span><h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.description}</p><Link href={`/blog/${post.slug}`} className={styles.textLink}>Makaleyi oku <ArrowRight size={17} /></Link></article>)}</div>
      </div></section>
      <section className={styles.ctaSection}><div className={`container ${styles.ctaInner}`}><div><span>İŞLETMENİZE UYGUN AKIŞ</span><h2>Hangi süreci dijitalleştirmek istiyorsunuz?</h2></div><Link href="/iletisim" className={styles.lightButton}>Birlikte değerlendirelim <ArrowRight size={18} /></Link></div></section>
    </MarketingShell>
  );
}
