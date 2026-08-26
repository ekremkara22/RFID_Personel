import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Search } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

function fullName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export default async function UsersPage(props: { searchParams: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { name: { contains: query } },
            { email: { contains: query } },
            { companyAccess: { some: { company: { name: { contains: query } } } } },
          ],
        }
      : undefined,
    include: {
      company: true,
      companyAccess: { include: { company: true }, orderBy: { createdAt: "asc" } },
      deviceAccess: { include: { device: { include: { company: true } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sistem Yetkilileri</p>
          <h1 className={styles.title}>Kullanici Tanimlari</h1>
          <p className={styles.subtitle}>
            Firma adminlerini buradan olustur, kullaniciya firma ve RFID cihaz yetkilerini ata.
          </p>
        </div>
        <Link href="/dashboard/users/new" className={styles.primaryLinkButton}>
          <CirclePlus size={18} />
          <span>Yeni Kullanici</span>
        </Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <Search size={18} />
            <input name="q" defaultValue={query} placeholder="Ad, e-posta veya firma ile ara" />
            <button type="submit">Ara</button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kullanici</th>
                <th>Rol</th>
                <th>Firmalar</th>
                <th>Cihazlar</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className={styles.emptyCell}>Kullanici bulunamadi.</td></tr>
              ) : users.map((item) => {
                const companyNames = item.companyAccess.length > 0
                  ? item.companyAccess.map((access) => access.company.name).join(", ")
                  : item.company?.name ?? "-";
                return (
                  <tr key={item.id}>
                    <td><strong>{fullName(item)}</strong><p className={styles.tableSubText}>{item.email}</p></td>
                    <td>{item.role === Role.SUPERADMIN ? "Super Admin" : "Firma Admin"}</td>
                    <td>{companyNames}</td>
                    <td>{item.deviceAccess.length} cihaz</td>
                    <td><Link href={`/dashboard/users/${item.id}`} className={styles.inlineAction}>Incele</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
