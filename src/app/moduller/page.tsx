import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleCard } from "@/components/marketing/module-card";
import { getMarketingModules } from "@/lib/marketing/modules";
import styles from "../marketing.module.css";

export const metadata: Metadata = { title: "Modüller ve Fiyatlar", description: "Flodeska İK & RFID personel takip ve Muhasebe (maaş hesaplama, bütçe raporu) modüllerini inceleyin, ücretsiz deneyin veya satın alın.", alternates: { canonical: "/moduller" } };

export const revalidate = 300;

export default async function ModulesPage() {
  const modules = await getMarketingModules();
  return <MarketingShell>
    <section className={styles.pageHero}><div className="container">
      <div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / Modüller</div>
      <h1>Modüller</h1>
      <p>Her modül ayrı lisanslanır ve aynı hesapta birlikte çalışır. Kayıt olduğunuzda 14 gün boyunca hepsini ücretsiz kullanabilirsiniz.</p>
    </div></section>
    <section className={styles.sectionTight}><div className="container">
      <div className={styles.moduleGrid}>{modules.map((module) => <ModuleCard key={module.key} module={module} headingLevel="h2" />)}</div>
      <div className={styles.moduleGrid} style={{ marginTop: 20 }}>
        <article className={styles.roadmapCard}><span>Hazırlanıyor</span><h2>Üretim Planlama</h2><p>İş merkezi ve kalıp tanımları, iş emirleri, kapasite planı ve Gantt görünümü.</p></article>
        <article className={styles.roadmapCard}><span>Hazırlanıyor</span><h2>IoT ve saha cihazları</h2><p>Okuyucu ve sensör verisinin iş kurallarıyla eşleştirilmesi.</p></article>
      </div>
    </div></section>
  </MarketingShell>;
}
