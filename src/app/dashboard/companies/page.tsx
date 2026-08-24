import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Pencil, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

function getUserFullName(user: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export default async function CompaniesPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const companies = await prisma.company.findMany({
    where: query
      ? {
          OR: [
            { id: { contains: query } },
            { name: { contains: query } },
            { contactName: { contains: query } },
            { contactEmail: { contains: query } },
            { contactPhone: { contains: query } },
          ],
        }
      : undefined,
    include: {
      users: {
        where: { role: "COMPANY_ADMIN" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          employees: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Firmalar</p>
          <h1 className={styles.title}>Musteri Firma Yonetimi</h1>
          <p className={styles.subtitle}>
            Tanimli firmalari listeleyebilir, detaylarina gidip inceleyebilir ve duzenleyebilirsin.
          </p>
        </div>

        <Link href="/dashboard/companies/new" className={styles.primaryLinkButton}>
          <CirclePlus size={18} />
          <span>Yeni Firma Ekle</span>
        </Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <Search size={18} />
            <input
              name="q"
              defaultValue={query}
              placeholder="Firma arama: ad, id, yetkili, mail veya telefon"
            />
            <button type="submit">Search</button>
          </form>
        </div>

        {companies.length === 0 ? (
          <p className={styles.emptyState}>Aramana uygun firma bulunamadi.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Firma id</th>
                  <th>Firma Adi</th>
                  <th>Firma Admini</th>
                  <th>Personel Sayisi</th>
                  <th>Statu</th>
                  <th>Duzelt</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <Link href={`/dashboard/companies/${company.id}`} className={styles.monoLink}>
                        {company.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/dashboard/companies/${company.id}`} className={styles.strongLink}>
                        {company.name}
                      </Link>
                      <p className={styles.tableSubText}>
                        {company.contactEmail ?? company.contactPhone ?? "Iletisim bilgisi yok"}
                      </p>
                    </td>
                    <td>
                      {company.users[0]
                        ? getUserFullName(company.users[0])
                        : "Firma admini tanimlanmadi"}
                    </td>
                    <td>{company._count.employees}</td>
                    <td>
                      <span className={company.isActive ? styles.statusActive : styles.statusPassive}>
                        {company.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/companies/${company.id}`} className={styles.inlineAction}>
                        <Pencil size={16} />
                        <span>Incele</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
