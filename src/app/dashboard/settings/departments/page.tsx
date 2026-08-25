import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function DepartmentsPage(props: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const departments = await prisma.department.findMany({
    where: {
      companyId: user.companyId,
      ...(query ? { name: { contains: query } } : {}),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Departmanlar</h1>
          <p className={styles.subtitle}>Departmanlari tablo uzerinden izle, ara ve detay sayfasinda duzenle.</p>
        </div>
        <Link href="/dashboard/settings/departments/new" className={styles.primaryLinkButton}>Departman Ekle</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Departman ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Departman</th>
                <th>Durum</th>
                <th>Kayit Tarihi</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan={4} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : departments.map((department) => (
                <tr key={department.id}>
                  <td>{department.name}</td>
                  <td>{department.isActive ? "Aktif" : "Pasif"}</td>
                  <td>{new Intl.DateTimeFormat("tr-TR").format(department.createdAt)}</td>
                  <td><Link href={`/dashboard/settings/departments/${department.id}`} className={styles.inlineAction}>Incele</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
