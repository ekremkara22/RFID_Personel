import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { deleteCalendarAssignmentAction, updateCalendarAssignmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { getAccessibleCompanyIds, scopedCompanyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseRouteId } from "@/lib/ids";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { formatDateInput, scopeLabels } from "../../calendar-labels";
import { AssignmentForm } from "../assignment-form";

export default async function AssignmentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const id = parseRouteId((await props.params).id);
  const companyIds = await getAccessibleCompanyIds(user);
  const scopedCompanyWhere = scopedCompanyFilter(companyIds);
  const [assignment, companies, templates, branches, departments, employees] = await Promise.all([
    prisma.calendarAssignment.findFirst({
      where: {
        id,
        ...scopedCompanyWhere,
      },
      include: { company: true, branch: true, department: true, employee: true, calendarTemplate: true },
    }),
    prisma.company.findMany({
      where: { ...(companyIds ? { id: { in: companyIds } } : {}), isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.workCalendarTemplate.findMany({ where: { ...scopedCompanyWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { ...scopedCompanyWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { ...scopedCompanyWhere, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: scopedCompanyWhere, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);
  if (!assignment) notFound();
  const scopeName = assignment.branch?.name ?? assignment.department?.name ?? (assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : "Sirket geneli");

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Takvim Atamasi</p><h1 className={styles.title}>{assignment.calendarTemplate.name}</h1><p className={styles.subtitle}>{scopeLabels[assignment.scopeType]} - {scopeName}</p></div>
        <BackLink href="/dashboard/calendar/assignments" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <AssignmentForm
          action={updateCalendarAssignmentAction}
          companies={companies.map((company) => ({ id: company.id, name: company.name }))}
          templates={templates.map((template) => ({ id: template.id, name: template.name, companyId: template.companyId }))}
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name, companyId: branch.companyId }))}
          departments={departments.map((department) => ({ id: department.id, name: department.name, companyId: department.companyId }))}
          employees={employees.map((employee) => ({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            companyId: employee.companyId,
          }))}
          values={{
            assignmentId: assignment.id,
            companyId: assignment.companyId,
            calendarTemplateId: assignment.calendarTemplateId,
            scopeType: assignment.scopeType,
            branchId: assignment.branchId,
            departmentId: assignment.departmentId,
            employeeId: assignment.employeeId,
            validFrom: formatDateInput(assignment.validFrom),
            validTo: formatDateInput(assignment.validTo),
            priority: assignment.priority,
            description: assignment.description,
            conflictReason: assignment.conflictReason,
            conflictApproved: assignment.conflictApproved,
            isActive: assignment.isActive,
          }}
          submitLabel="Guncelle"
          pendingLabel="Guncelleniyor..."
          lockCompany
        />
        <form action={deleteCalendarAssignmentAction} className={styles.dangerForm}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/assignments" />
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <input type="hidden" name="companyId" value={assignment.companyId} />
          <SubmitButton idleLabel="Atamayi Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
        </form>
      </section>
    </div>
  );
}
