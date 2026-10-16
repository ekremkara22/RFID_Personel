import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleCard } from "@/components/marketing/module-card";
import { blogPosts } from "@/lib/marketing/blog-posts";
import { getMarketingModules } from "@/lib/marketing/modules";
import styles from "../marketing.module.css";

export const metadata: Metadata = { title: "Blog: Personel Takibi, Maaş Hesaplama ve Bordro", description: "RFID personel takibi, PDKS, brütten nete maaş hesaplama, işveren maliyeti ve personel bütçesi üzerine rehberler.", alternates: { canonical: "/blog" } };

export const revalidate = 300;

export default async function BlogPage() {
  const modules = await getMarketingModules();
  return <MarketingShell>
    <section className={styles.pageHero}><div className="container"><div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / Blog</div><h1>Blog</h1><p>Personel takibi, maaş hesabı ve bordro üzerine, rakamlarla anlatılmış rehberler.</p></div></section>
    <section className={styles.sectionTight}><div className={`container ${styles.threeGrid}`}>{blogPosts.map((post) => <article className={styles.blogCard} key={post.slug}><span>{post.category} · {post.readingTime}</span><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.description}</p><Link href={`/blog/${post.slug}`} className={styles.textLink}>Yazıyı oku <ArrowRight size={16} /></Link></article>)}</div></section>
    <section className={`${styles.sectionTight} ${styles.softSection}`}><div className="container">
      <div className={styles.sectionHead}><div><span className={styles.label}>Modüller</span><h2>Yazılarda anlatılanları panelde deneyin</h2></div></div>
      <div className={styles.twoGrid}>{modules.map((item) => <ModuleCard key={item.key} module={item} />)}</div>
    </div></section>
  </MarketingShell>;
}
