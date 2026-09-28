import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CirclePlus, Filter, Search } from "lucide-react";
import { assertPermission, can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { EmployeesTable } from "./employees-table";
import styles from "../page.module.css";
import ui from "../management.module.css";

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
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Personel yönetimi</p>
          <h1 className={ui.pageTitle}>Personel Kayıtları</h1>
          <p className={ui.pageDescription}>Çalışanların kimlik, organizasyon ve RFID bilgilerini sade bir listede yönetin.</p>
        </div>
        {can(authorization, PERMISSIONS.PERSONNEL_CREATE) ? <div className={ui.headerActions}><Link href="/dashboard/employees/new" className={ui.primaryAction}><CirclePlus size={16} />Yeni Personel</Link></div> : null}
      </header>

      <section className={ui.surface} aria-label="Personel filtreleri">
        <form className={ui.filterBar}>
          <label className={ui.field}><span className={ui.fieldLabel}>Personel veya RFID ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Ad, soyad, e-posta veya kart numarası" /></span></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Şube</span><select className={ui.control} name="branchId" defaultValue={branchId ?? ""}><option value="">Tüm şubeler</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman</span><select className={ui.control} name="departmentId" defaultValue={departmentId ?? ""}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button type="submit" className={ui.filterButton}><Filter size={15} />Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Personel listesi</h2><p><Building2 size={14} /> {company.name}</p></div><span className={ui.countBadge}>{employees.length} kayıt</span></div>
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
          canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)}
        />
      </section>
    </div>
  );
}
