import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function CompanyCategoriesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");

  const params = (await props.searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const categories = await prisma.companyCategory.findMany({
    where: query ? { name: { contains: query } } : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const usageCounts = await prisma.company.groupBy({
    by: ["category"],
    where: { category: { not: null } },
    _count: { _all: true },
  });
  const usageByName = new Map(usageCounts.map((item) => [item.category, item._count._all]));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanımlar</p>
          <h1 className={styles.title}>Firma Kategorileri</h1>
          <p className={styles.subtitle}>Firma tanımlarında kullanılan kategorileri arayın, görüntüleyin ve yönetin.</p>
        </div>
        <Link href="/dashboard/settings/company-categories/new" className={styles.primaryLinkButton}>Kategori Ekle</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Kategori ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Kategori</th><th>Kullanan Firma</th><th>Durum</th><th>Kayıt Tarihi</th><th>İşlem</th></tr></thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={5} className={styles.emptyCell}>Kayıt bulunamadı.</td></tr>
              ) : categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td>{usageByName.get(category.name) ?? 0}</td>
                  <td>{category.isActive ? "Aktif" : "Pasif"}</td>
                  <td>{new Intl.DateTimeFormat("tr-TR").format(category.createdAt)}</td>
                  <td><Link href={`/dashboard/settings/company-categories/${category.id}`} className={styles.inlineAction}>İncele</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
