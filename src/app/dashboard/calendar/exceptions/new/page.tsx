import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarApprovalStatus, CalendarScopeType, WorkDayType } from "@/generated/prisma/client";
import { createCalendarDailyExceptionAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { approvalLabels, dayTypeLabels, scopeLabels } from "../../calendar-labels";

const exceptionDayTypes = [
  WorkDayType.NORMAL_WORK,
  WorkDayType.WEEKLY_REST,
  WorkDayType.COMPANY_HOLIDAY,
  WorkDayType.HALF_WORK,
  WorkDayType.SPECIAL_WORK,
];

export default async function NewCalendarExceptionPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const [branches, departments, employees] = await Promise.all([
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Gunluk Istisna</p>
          <h1 className={styles.title}>Istisna Ekle</h1>
          <p className={styles.subtitle}>Tek bir tarih icin normal calisma kuralini degistirin.</p>
        </div>
        <Link href="/dashboard/calendar/exceptions" className={styles.inlineAction}>Listeye Don</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarDailyExceptionAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/exceptions" />
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
    </div>
  );
}
