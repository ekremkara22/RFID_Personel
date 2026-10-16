import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleBuyBar, ModuleSideCard } from "@/components/marketing/module-card";
import site from "@/components/marketing/site.module.css";
import { blogPosts, getBlogPost } from "@/lib/marketing/blog-posts";
import { getMarketingModules } from "@/lib/marketing/modules";
import styles from "../../marketing.module.css";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export function generateStaticParams() { return blogPosts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const post = getBlogPost((await params).slug); if (!post) return {}; return { title: post.title, description: post.description, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.publishedAt } }; }

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

export default async function BlogPostPage({ params }: Props) {
  const post = getBlogPost((await params).slug); if (!post) notFound();
  const modules = await getMarketingModules();
  const related = modules.find((item) => item.key === post.relatedModule) ?? modules[0];
  const others = modules.filter((item) => item.key !== related.key);
  const articleJsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.description, datePublished: post.publishedAt, inLanguage: "tr-TR", author: { "@type": "Organization", name: "Flodeska" }, publisher: { "@type": "Organization", name: "Flodeska" }, mainEntityOfPage: `https://flodeska.com/blog/${post.slug}` };
  const faqJsonLd = post.faqs?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: post.faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) } : null;
  return <MarketingShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd ? [articleJsonLd, faqJsonLd] : articleJsonLd) }} />
    <div>
      <section className={styles.pageHero}><div className="container"><div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / <Link href="/blog">Blog</Link> / {post.category}</div><h1>{post.title}</h1><p>{post.description}</p><div className={styles.postMeta}><span>{post.category}</span><span>{post.readingTime} okuma</span><time dateTime={post.publishedAt}>{dateFormat.format(new Date(`${post.publishedAt}T12:00:00Z`))}</time></div></div></section>
      <section className={styles.section}><div className={`container ${styles.contentGrid}`}>
        <article className={styles.prose}>
          {post.sections.map((section) => <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            {section.table ? <div className={styles.tableWrap}><table>
              {section.table.caption ? <caption className={styles.tableCaption}>{section.table.caption}</caption> : null}
              <thead><tr>{section.table.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
              <tbody>{section.table.rows.map((row) => <tr key={row.join("|")}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
            </table></div> : null}
            {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>)}
          {post.faqs?.length ? <section><h2>Sık sorulan sorular</h2><div className={styles.faq}>{post.faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></section> : null}
          <section><h2>{related.title}</h2><p>{related.summary} <Link href={related.href}>Modülü inceleyin</Link>.</p></section>
        </article>
        <div className={site.sideOffers}>
          <ModuleSideCard module={related} />
          {others.map((item) => <ModuleSideCard key={item.key} module={item} />)}
        </div>
      </div></section>
    </div>
    <ModuleBuyBar module={related} />
  </MarketingShell>;
}
