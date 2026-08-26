import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createCalendarAssignmentAction } from "@/app/dashboard/actions";
import { getAccessibleCompanyIds, scopedCompanyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { AssignmentForm } from "../assignment-form";

export default async function NewCalendarAssignmentPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const companyIds = await getAccessibleCompanyIds(user);
  const currentCompanyId = user.companyId ?? companyIds?.[0] ?? "";
  const companyWhere = { ...(companyIds ? { id: { in: companyIds } } : {}), isActive: true };
  const scopedCompanyWhere = scopedCompanyFilter(companyIds);

  const [companies, templates, branches, departments, employees] = await Promise.all([
    prisma.company.findMany({ where: companyWhere, orderBy: { name: "asc" } }),
    prisma.workCalendarTemplate.findMany({ where: { ...scopedCompanyWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { ...scopedCompanyWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { ...scopedCompanyWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: scopedCompanyWhere, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Takvim Atamasi</p>
          <h1 className={styles.title}>Atama Ekle</h1>
          <p className={styles.subtitle}>Takvim sablonunu firma, sube, departman veya personele baglayin.</p>
        </div>
        <BackLink href="/dashboard/calendar/assignments" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <AssignmentForm
          action={createCalendarAssignmentAction}
          companies={companies.map((company) => ({ id: company.id, name: company.name }))}
          templates={templates.map((template) => ({ id: template.id, name: template.name, companyId: template.companyId }))}
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name, companyId: branch.companyId }))}
          departments={departments.map((department) => ({ id: department.id, name: department.name, companyId: department.companyId }))}
          employees={employees.map((employee) => ({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            companyId: employee.companyId,
          }))}
          values={{ companyId: currentCompanyId || companies[0]?.id }}
          submitLabel="Atama Kaydet"
          pendingLabel="Kaydediliyor..."
        />
      </section>
    </div>
  );
}
