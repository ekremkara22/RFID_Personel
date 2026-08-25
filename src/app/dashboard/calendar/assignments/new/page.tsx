import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { CalendarScopeType } from "@/generated/prisma/client";
import { createCalendarAssignmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { scopeLabels } from "../../calendar-labels";

export default async function NewCalendarAssignmentPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const [templates, branches, departments, employees] = await Promise.all([
    prisma.workCalendarTemplate.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
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
        <form action={createCalendarAssignmentAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/assignments" />
          <label className={styles.field}>
            <span>Takvim Sablonu</span>
            <select name="calendarTemplateId" required defaultValue="">
              <option value="" disabled>Sablon sec</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Kapsam</span>
            <select name="scopeType" defaultValue={CalendarScopeType.COMPANY}>
              {Object.values(CalendarScopeType).map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Sube</span>
            <select name="branchId" defaultValue="">
              <option value="">Secilmedi</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Departman</span>
            <select name="departmentId" defaultValue="">
              <option value="">Secilmedi</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Personel</span>
            <select name="employeeId" defaultValue="">
              <option value="">Secilmedi</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Baslangic</span>
            <input name="validFrom" type="date" required />
          </label>
          <label className={styles.field}>
            <span>Bitis</span>
            <input name="validTo" type="date" />
          </label>
          <label className={styles.field}>
            <span>Oncelik</span>
            <input name="priority" type="number" defaultValue={100} />
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Aciklama</span>
            <textarea name="description" />
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Cakisma Onay Aciklamasi</span>
            <input name="conflictReason" placeholder="Cakisan atama varsa nedenini yazin" />
          </label>
          <label className={styles.checkField}>
            <input name="conflictApproved" type="checkbox" />
            <span>Cakismayi onaylayarak kaydet</span>
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Atama Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
