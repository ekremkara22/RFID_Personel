import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarApprovalStatus, CalendarScopeType, WorkDayType } from "@/generated/prisma/client";
import { createCalendarDailyExceptionAction, updateCalendarDailyExceptionAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { approvalLabels, dayTypeLabels, formatDate, scopeLabels } from "../calendar-labels";

const exceptionDayTypes = [
  WorkDayType.NORMAL_WORK,
  WorkDayType.WEEKLY_REST,
  WorkDayType.COMPANY_HOLIDAY,
  WorkDayType.HALF_WORK,
  WorkDayType.SPECIAL_WORK,
];

export default async function CalendarExceptionsPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const [branches, departments, employees, exceptions] = await Promise.all([
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.calendarDailyException.findMany({
      where: {
        companyId: user.companyId,
        ...(query ? { changeReason: { contains: query } } : {}),
      },
      include: { branch: true, department: true, employee: true },
      orderBy: { workDate: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Gunluk Istisnalar</h1>
          <p className={styles.subtitle}>Belirli bir tarih icin sirket, sube, departman veya personel seviyesinde calisma kuralini degistirin.</p>
        </div>
        <Link href="#new-record" className={styles.primaryLinkButton}>Istisna Ekle</Link>
      </section>

      <section id="new-record" className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarDailyExceptionAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Tarih</span>
            <input name="workDate" type="date" required />
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
            <span>Yeni Gun Durumu</span>
            <select name="newDayType" defaultValue={WorkDayType.NORMAL_WORK}>
              {exceptionDayTypes.map((type) => <option key={type} value={type}>{dayTypeLabels[type]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Yeni Giris</span>
            <input name="newStartTime" type="time" />
          </label>
          <label className={styles.field}>
            <span>Yeni Cikis</span>
            <input name="newEndTime" type="time" />
          </label>
          <label className={styles.field}>
            <span>Yeni Mola dk</span>
            <input name="newBreakMinutes" type="number" />
          </label>
          <label className={styles.field}>
            <span>Onay Durumu</span>
            <select name="approvalStatus" defaultValue={CalendarApprovalStatus.APPROVED}>
              {Object.values(CalendarApprovalStatus).map((status) => <option key={status} value={status}>{approvalLabels[status]}</option>)}
            </select>
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Degisiklik Nedeni</span>
            <textarea name="changeReason" required />
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Istisna Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Degisiklik nedeni ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kapsam</th>
                <th>Yeni Durum</th>
                <th>Saat</th>
                <th>Onay</th>
                <th>Incele</th>
                <th>Guncelle</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Henuz gunluk istisna yok.</td></tr>
              ) : exceptions.map((exception) => {
                const scopeName = exception.branch?.name
                  ?? exception.department?.name
                  ?? (exception.employee ? `${exception.employee.firstName} ${exception.employee.lastName}` : "Sirket geneli");

                return (
                  <tr key={exception.id}>
                    <td>{formatDate(exception.workDate)}</td>
                    <td>{scopeLabels[exception.scopeType]}<p className={styles.tableSubText}>{scopeName}</p></td>
                    <td>{dayTypeLabels[exception.newDayType]}</td>
                    <td>{exception.newStartTime ?? "-"} / {exception.newEndTime ?? "-"}</td>
                    <td>{approvalLabels[exception.approvalStatus]}</td>
                    <td><Link href={`/dashboard/calendar/exceptions/${exception.id}`} className={styles.inlineAction}>Incele</Link></td>
                    <td>
                      <form action={updateCalendarDailyExceptionAction} className={styles.inlineEditForm}>
                        <input type="hidden" name="exceptionId" value={exception.id} />
                        <select name="newDayType" defaultValue={exception.newDayType}>
                          {exceptionDayTypes.map((type) => <option key={type} value={type}>{dayTypeLabels[type]}</option>)}
                        </select>
                        <input name="newStartTime" type="time" defaultValue={exception.newStartTime ?? ""} />
                        <input name="newEndTime" type="time" defaultValue={exception.newEndTime ?? ""} />
                        <input name="newBreakMinutes" type="number" defaultValue={exception.newBreakMinutes ?? ""} />
                        <select name="approvalStatus" defaultValue={exception.approvalStatus}>
                          {Object.values(CalendarApprovalStatus).map((status) => <option key={status} value={status}>{approvalLabels[status]}</option>)}
                        </select>
                        <input name="changeReason" defaultValue={exception.changeReason} required />
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
