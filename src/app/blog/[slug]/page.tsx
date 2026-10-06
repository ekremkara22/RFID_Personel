import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { blogPosts, getBlogPost } from "@/lib/marketing/blog-posts";
import styles from "../../marketing.module.css";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return blogPosts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const post = getBlogPost((await params).slug); if (!post) return {}; return { title: post.title, description: post.description, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.publishedAt } }; }

export default async function BlogPostPage({ params }: Props) {
  const post = getBlogPost((await params).slug); if (!post) notFound();
  const articleJsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.description, datePublished: post.publishedAt, author: { "@type": "Organization", name: "Flodeska" }, publisher: { "@type": "Organization", name: "Flodeska" }, mainEntityOfPage: `https://flodeska.com/blog/${post.slug}` };
  return <MarketingShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
    <section className={styles.pageHero}><div className="container"><div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / <Link href="/blog">Blog</Link> / {post.category}</div><h1>{post.title}</h1><p>{post.description}</p><div className={styles.postMeta}><span>{post.category}</span><span>{post.readingTime} okuma</span><time dateTime={post.publishedAt}>4 Ekim 2026</time></div></div></section>
    <section className={styles.section}><div className={`container ${styles.contentGrid}`}><article className={styles.prose}>{post.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}</section>)}</article><aside className={styles.sideCard}><h2>Sürecinizi birlikte değerlendirelim</h2><p>İK, RFID ve IoT süreçleriniz için ihtiyaçları birlikte netleştirebiliriz.</p><Link href="/iletisim" className={styles.textLink}>Flodeska ile iletişime geçin</Link></aside></div></section>
  </MarketingShell>;
}
