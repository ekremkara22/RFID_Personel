import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Filter, Search } from "lucide-react";
import { assertPermission, can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { EmployeesTable } from "./employees-table";
import styles from "../page.module.css";

export default async function EmployeesPage(props: {
  searchParams: Promise<{ q?: string; branchId?: string; departmentId?: string }>;
}) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.PERSONNEL_VIEW);
  if (!authorization.companyId) redirect("/dashboard");

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const requestedBranchId = Number(searchParams.branchId);
  const requestedDepartmentId = Number(searchParams.departmentId);

  const [company, branches, departments] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: authorization.companyId } }),
    prisma.branch.findMany({ where: { companyId: authorization.companyId, isActive: true, ...(authorization.scopeMode === "RESTRICTED" && authorization.branchIds.length ? { id: { in: authorization.branchIds } } : {}) }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: authorization.companyId, isActive: true, ...(authorization.scopeMode === "RESTRICTED" && authorization.departmentIds.length ? { id: { in: authorization.departmentIds } } : {}) }, orderBy: { name: "asc" } }),
  ]);
  const branchId = branches.some((item) => item.id === requestedBranchId) ? requestedBranchId : null;
  const departmentId = departments.some((item) => item.id === requestedDepartmentId) ? requestedDepartmentId : null;

  const employees = await prisma.employee.findMany({
    where: {
      ...employeeScopeWhere(authorization),
      ...(branchId ? { branchId } : {}),
      ...(departmentId ? { departmentId } : {}),
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
        {can(authorization, PERMISSIONS.PERSONNEL_CREATE) ? <Link href="/dashboard/employees/new" className={styles.primaryLinkButton}>
          <CirclePlus size={18} />
          <span>Yeni Personel</span>
        </Link> : null}
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}><span>Personel / RFID</span><span className={styles.searchForm}><Search size={18} /><input name="q" defaultValue={query} placeholder="Ad, soyad, e-posta veya kart" /></span></label>
          <label className={styles.field}><span>Firma</span><input value={company.name} readOnly /></label>
          <label className={styles.field}><span>Şube</span><select name="branchId" defaultValue={branchId ?? ""}><option value="">Tüm Şubeler</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className={styles.field}><span>Departman</span><select name="departmentId" defaultValue={departmentId ?? ""}><option value="">Tüm Departmanlar</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
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
