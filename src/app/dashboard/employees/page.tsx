import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Eye, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

export default async function EmployeesPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const employees = await prisma.employee.findMany({
    where: {
      companyId: user.companyId,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { department: { contains: query } },
              { rfidCardId: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personeller</p>
          <h1 className={styles.title}>Personel Yonetimi</h1>
          <p className={styles.subtitle}>
            Personel kayitlarini tam sayfa tabloda arayabilir, kart ID ve departman bilgilerini
            hizlica kontrol edebilirsin.
          </p>
        </div>
        <Link href="/dashboard/employees/new" className={styles.primaryLinkButton}>
          <CirclePlus size={18} />
          <span>Yeni Personel</span>
        </Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <Search size={18} />
            <input
              name="q"
              defaultValue={query}
              placeholder="Ad, soyad, departman, e-posta veya RFID kart ile ara"
            />
            <button type="submit">Ara</button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Departman</th>
                <th>RFID Kart ID</th>
                <th>E-posta</th>
                <th>Statu</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    Aramana uygun personel bulunamadi.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>
                        {employee.firstName} {employee.lastName}
                      </strong>
                      <p className={styles.tableSubText}>{employee.age} yas</p>
                    </td>
                    <td>{employee.department}</td>
                    <td className={styles.monoCell}>{employee.rfidCardId ?? "Kart atanmadi"}</td>
                    <td>{employee.email ?? "-"}</td>
                    <td>
                      <span className={employee.isActive ? styles.statusActive : styles.statusPassive}>
                        {employee.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/employees/${employee.id}`} className={styles.inlineAction}>
                        <Eye size={16} />
                        <span>Incele</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
