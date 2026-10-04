import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { blogPosts } from "@/lib/marketing/blog-posts";
import styles from "../marketing.module.css";

export const metadata: Metadata = { title: "Blog | İş Süreçleri ve IoT", description: "RFID, PDKS, IoT ve iş süreçlerinin dijitalleşmesi hakkında rehberler ve uygulama notları.", alternates: { canonical: "/blog" } };

export default function BlogPage() {
  return <MarketingShell>
    <section className={styles.pageHero}><div className="container"><div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / Blog</div><h1>Dijital süreçler için anlaşılır ve uygulanabilir bilgiler.</h1><p>İK teknolojileri, bağlı cihazlar ve operasyon yönetimi hakkında karar verirken kullanabileceğiniz rehberler.</p></div></section>
    <section className={styles.section}><div className={`container ${styles.threeGrid}`}>{blogPosts.map((post) => <article className={styles.blogCard} key={post.slug}><span>{post.category} · {post.readingTime}</span><h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.description}</p><Link href={`/blog/${post.slug}`} className={styles.textLink}>Makaleyi oku <ArrowRight size={17} /></Link></article>)}</div></section>
  </MarketingShell>;
}
