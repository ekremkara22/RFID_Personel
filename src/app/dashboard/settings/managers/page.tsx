import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function ManagersPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const managers = await prisma.manager.findMany({
    where: {
      companyId: user.companyId,
      ...(query ? { OR: [{ name: { contains: query } }, { email: { contains: query } }] } : {}),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Yoneticiler</h1>
          <p className={styles.subtitle}>Bagli yoneticileri ara, listele ve detay ekraninda duzenle.</p>
        </div>
        <Link href="/dashboard/settings/managers/new" className={styles.primaryLinkButton}>Yonetici Ekle</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Yonetici veya mail ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Yonetici</th><th>Mail</th><th>Durum</th><th>Islem</th></tr></thead>
            <tbody>
              {managers.length === 0 ? (
                <tr><td colSpan={4} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : managers.map((manager) => (
                <tr key={manager.id}>
                  <td>{manager.name}</td>
                  <td>{manager.email ?? "-"}</td>
                  <td>{manager.isActive ? "Aktif" : "Pasif"}</td>
                  <td><Link href={`/dashboard/settings/managers/${manager.id}`} className={styles.inlineAction}>Incele</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
