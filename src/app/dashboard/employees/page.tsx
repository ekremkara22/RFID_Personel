import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Filter, Search } from "lucide-react";
import { getAccessibleCompanyIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { EmployeesTable } from "./employees-table";
import styles from "../page.module.css";

export default async function EmployeesPage(props: {
  searchParams: Promise<{ q?: string; companyId?: string; branch?: string; department?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const companyIds = await getAccessibleCompanyIds(user);
  const scopedCompanyIds = companyIds ?? [];
  if (scopedCompanyIds.length === 0) redirect("/dashboard/companies/new");
  const requestedCompanyId = Number(searchParams.companyId);
  const selectedCompanyId = Number.isSafeInteger(requestedCompanyId) && scopedCompanyIds.includes(requestedCompanyId)
    ? requestedCompanyId
    : null;
  const filteredCompanyIds = selectedCompanyId ? [selectedCompanyId] : scopedCompanyIds;
  const requestedBranch = typeof searchParams.branch === "string" ? searchParams.branch.trim() : "";
  const requestedDepartment = typeof searchParams.department === "string" ? searchParams.department.trim() : "";

  const [companies, branches, departments] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: scopedCompanyIds } }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: { in: filteredCompanyIds }, isActive: true }, include: { company: true }, orderBy: [{ companyId: "asc" }, { name: "asc" }] }),
    prisma.department.findMany({ where: { companyId: { in: filteredCompanyIds }, isActive: true }, orderBy: [{ companyId: "asc" }, { name: "asc" }] }),
  ]);
  const branch = requestedBranch && branches.some((item) => item.name === requestedBranch) ? requestedBranch : "";
  const department = requestedDepartment && departments.some((item) => item.name === requestedDepartment) ? requestedDepartment : "";

  const employees = await prisma.employee.findMany({
    where: {
      companyId: { in: filteredCompanyIds },
      ...(branch ? { branch } : {}),
      ...(department ? { department } : {}),
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
    include: { company: true },
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
        <form className={styles.filterGrid}>
          <label className={styles.field}><span>Personel / RFID</span><span className={styles.searchForm}><Search size={18} /><input name="q" defaultValue={query} placeholder="Ad, soyad, e-posta veya kart" /></span></label>
          <label className={styles.field}><span>Firma</span><select name="companyId" defaultValue={selectedCompanyId ?? ""}><option value="">Tüm Firmalar</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className={styles.field}><span>Şube</span><select name="branch" defaultValue={branch}><option value="">Tüm Şubeler</option>{branches.map((item) => <option key={item.id} value={item.name}>{companies.length > 1 ? `${item.company.name} / ` : ""}{item.name}</option>)}</select></label>
          <label className={styles.field}><span>Departman</span><select name="department" defaultValue={department}><option value="">Tüm Departmanlar</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <button type="submit" className={styles.primaryButton}><Filter size={16} /><span>Filtrele</span></button>
        </form>

        <EmployeesTable
          employees={employees.map((employee) => ({
            id: employee.id,
            photoUrl: employee.photoUrl ?? "",
            fullName: `${employee.firstName} ${employee.lastName}`.trim(),
            registrationNumber: employee.registrationNumber ?? "-",
            age: employee.age,
            companyName: employee.company.name,
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
