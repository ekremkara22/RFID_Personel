import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { EmployeesTable } from "./employees-table";
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

        <EmployeesTable
          employees={employees.map((employee) => ({
            id: employee.id,
            photoUrl: employee.photoUrl ?? "",
            fullName: `${employee.firstName} ${employee.lastName}`.trim(),
            registrationNumber: employee.registrationNumber ?? "-",
            age: employee.age,
            department: employee.department,
            branch: employee.branch ?? "-",
            hireDate: employee.hireDate ? employee.hireDate.toLocaleDateString("tr-TR") : "-",
            terminationDate: employee.terminationDate ? employee.terminationDate.toLocaleDateString("tr-TR") : "-",
            managerName: employee.managerName ?? "-",
            rfidCardId: employee.rfidCardId ?? "Kart atanmadi",
            email: employee.email ?? "-",
            status: employee.isActive ? "Aktif" : "Pasif",
          }))}
        />
      </section>
    </div>
  );
}
