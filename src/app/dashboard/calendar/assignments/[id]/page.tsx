import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { deleteCalendarAssignmentAction, updateCalendarAssignmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { formatDateInput, scopeLabels } from "../../calendar-labels";

export default async function AssignmentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const { id } = await props.params;
  const [assignment, templates] = await Promise.all([
    prisma.calendarAssignment.findFirst({ where: { id, companyId: user.companyId }, include: { branch: true, department: true, employee: true, calendarTemplate: true } }),
    prisma.workCalendarTemplate.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
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
        <form action={updateCalendarAssignmentAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/assignments" />
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <label className={styles.field}><span>Takvim Sablonu</span><select name="calendarTemplateId" defaultValue={assignment.calendarTemplateId}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          <label className={styles.field}><span>Baslangic</span><input name="validFrom" type="date" defaultValue={formatDateInput(assignment.validFrom)} required /></label>
          <label className={styles.field}><span>Bitis</span><input name="validTo" type="date" defaultValue={formatDateInput(assignment.validTo)} /></label>
          <label className={styles.field}><span>Oncelik</span><input name="priority" type="number" defaultValue={assignment.priority} /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" defaultValue={assignment.description ?? ""} /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Cakisma Nedeni</span><input name="conflictReason" defaultValue={assignment.conflictReason ?? ""} /></label>
          <label className={styles.checkField}><input name="conflictApproved" type="checkbox" defaultChecked={assignment.conflictApproved} /><span>Cakisma onayli</span></label>
          <label className={styles.checkField}><input name="isActive" type="checkbox" defaultChecked={assignment.isActive} /><span>Aktif</span></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Degisiklik Nedeni</span><input name="changeReason" /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} /></div>
        </form>
        <form action={deleteCalendarAssignmentAction} className={styles.dangerForm}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/assignments" />
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <SubmitButton idleLabel="Atamayi Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
        </form>
      </section>
    </div>
  );
}
