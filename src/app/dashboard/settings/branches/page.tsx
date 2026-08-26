import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessibleCompanyIds, scopedCompanyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function BranchesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN" && (user.role !== "COMPANY_ADMIN" || !user.companyId)) redirect("/dashboard");
  const companyIds = await getAccessibleCompanyIds(user);

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const branches = await prisma.branch.findMany({
    where: {
      ...scopedCompanyFilter(companyIds),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { location: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
    },
    include: { company: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Subeler</h1>
          <p className={styles.subtitle}>Sube, firma ve lokasyonlari ara, listele ve detay ekraninda duzenle.</p>
        </div>
        <Link href="/dashboard/settings/branches/new" className={styles.primaryLinkButton}>Sube Ekle</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Sube, firma veya lokasyon ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Sube</th><th>Firma</th><th>Lokasyon</th><th>Durum</th><th>Islem</th></tr></thead>
            <tbody>
              {branches.length === 0 ? (
                <tr><td colSpan={5} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : branches.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.name}</td>
                  <td>{branch.company.name}</td>
                  <td>{branch.location ?? "-"}</td>
                  <td>{branch.isActive ? "Aktif" : "Pasif"}</td>
                  <td><Link href={`/dashboard/settings/branches/${branch.id}`} className={styles.inlineAction}>Incele</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
