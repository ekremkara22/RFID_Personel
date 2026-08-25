import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarScopeType } from "@/generated/prisma/client";
import { createCalendarAssignmentAction, updateCalendarAssignmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDateInput, scopeLabels } from "../calendar-labels";

export default async function CalendarAssignmentsPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const [templates, branches, departments, employees, assignments] = await Promise.all([
    prisma.workCalendarTemplate.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.calendarAssignment.findMany({
      where: {
        companyId: user.companyId,
        ...(query ? { description: { contains: query } } : {}),
      },
      include: { calendarTemplate: true, branch: true, department: true, employee: true },
      orderBy: [{ isActive: "desc" }, { validFrom: "desc" }],
      take: 200,
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Takvim Atamalari</h1>
          <p className={styles.subtitle}>Sablonlari sirket, sube, departman veya personel kapsaminda tarih araliklarina baglayin.</p>
        </div>
        <Link href="#new-record" className={styles.primaryLinkButton}>Atama Ekle</Link>
      </section>

      <section id="new-record" className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarAssignmentAction} className={styles.formGrid}>
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
          <label className={styles.checkboxField}>
            <input name="conflictApproved" type="checkbox" />
            <span>Cakismayi onaylayarak kaydet</span>
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Atama Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.tableWrap}>
          <div className={styles.listToolbar}>
            <form className={styles.searchForm}>
              <input name="q" defaultValue={query} placeholder="Aciklama ara" />
              <button type="submit">Ara</button>
            </form>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sablon</th>
                <th>Kapsam</th>
                <th>Tarih</th>
                <th>Oncelik</th>
                <th>Durum</th>
                <th>Incele</th>
                <th>Guncelle</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Henuz takvim atamasi yok.</td></tr>
              ) : assignments.map((assignment) => {
                const scopeName = assignment.branch?.name
                  ?? assignment.department?.name
                  ?? (assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : "Sirket geneli");

                return (
                  <tr key={assignment.id}>
                    <td>{assignment.calendarTemplate.name}</td>
                    <td>{scopeLabels[assignment.scopeType]}<p className={styles.tableSubText}>{scopeName}</p></td>
                    <td>{formatDateInput(assignment.validFrom)} / {formatDateInput(assignment.validTo) || "-"}</td>
                    <td>{assignment.priority}</td>
                    <td>{assignment.isActive ? "Aktif" : "Pasif"} {assignment.conflictApproved ? "- Cakisma onayli" : ""}</td>
                    <td><Link href={`/dashboard/calendar/assignments/${assignment.id}`} className={styles.inlineAction}>Incele</Link></td>
                    <td>
                      <form action={updateCalendarAssignmentAction} className={styles.inlineEditForm}>
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <select name="calendarTemplateId" defaultValue={assignment.calendarTemplateId}>
                          {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </select>
                        <input name="validFrom" type="date" defaultValue={formatDateInput(assignment.validFrom)} required />
                        <input name="validTo" type="date" defaultValue={formatDateInput(assignment.validTo)} />
                        <input name="priority" type="number" defaultValue={assignment.priority} />
                        <input name="description" defaultValue={assignment.description ?? ""} />
                        <input name="conflictReason" defaultValue={assignment.conflictReason ?? ""} placeholder="Cakisma nedeni" />
                        <label><input name="conflictApproved" type="checkbox" defaultChecked={assignment.conflictApproved} /> Onayli</label>
                        <label><input name="isActive" type="checkbox" defaultChecked={assignment.isActive} /> Aktif</label>
                        <input name="changeReason" placeholder="Degisiklik nedeni" />
                        <SubmitButton idleLabel="Kaydet" pendingLabel="..." className={styles.smallButton} />
                      </form>
                    </td>
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
