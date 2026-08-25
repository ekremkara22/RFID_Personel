import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarApprovalStatus, WorkDayType } from "@/generated/prisma/client";
import { updateCalendarDailyExceptionAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { approvalLabels, dayTypeLabels, formatDate } from "../../calendar-labels";

const exceptionDayTypes = [WorkDayType.NORMAL_WORK, WorkDayType.WEEKLY_REST, WorkDayType.COMPANY_HOLIDAY, WorkDayType.HALF_WORK, WorkDayType.SPECIAL_WORK];

export default async function ExceptionDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const { id } = await props.params;
  const exception = await prisma.calendarDailyException.findFirst({ where: { id, companyId: user.companyId }, include: { branch: true, department: true, employee: true } });
  if (!exception) notFound();
  const scopeName = exception.branch?.name ?? exception.department?.name ?? (exception.employee ? `${exception.employee.firstName} ${exception.employee.lastName}` : "Sirket geneli");

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div><p className={styles.eyebrow}>Gunluk Istisna</p><h1 className={styles.title}>{formatDate(exception.workDate)}</h1><p className={styles.subtitle}>{scopeName}</p></div>
        <Link href="/dashboard/calendar/exceptions" className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateCalendarDailyExceptionAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/exceptions" />
          <input type="hidden" name="exceptionId" value={exception.id} />
          <label className={styles.field}><span>Yeni Gun Durumu</span><select name="newDayType" defaultValue={exception.newDayType}>{exceptionDayTypes.map((type) => <option key={type} value={type}>{dayTypeLabels[type]}</option>)}</select></label>
          <label className={styles.field}><span>Yeni Giris</span><input name="newStartTime" type="time" defaultValue={exception.newStartTime ?? ""} /></label>
          <label className={styles.field}><span>Yeni Cikis</span><input name="newEndTime" type="time" defaultValue={exception.newEndTime ?? ""} /></label>
          <label className={styles.field}><span>Yeni Mola dk</span><input name="newBreakMinutes" type="number" defaultValue={exception.newBreakMinutes ?? ""} /></label>
          <label className={styles.field}><span>Onay Durumu</span><select name="approvalStatus" defaultValue={exception.approvalStatus}>{Object.values(CalendarApprovalStatus).map((status) => <option key={status} value={status}>{approvalLabels[status]}</option>)}</select></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Degisiklik Nedeni</span><textarea name="changeReason" defaultValue={exception.changeReason} required /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
