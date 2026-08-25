import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { CalendarScopeType, SpecialDayType } from "@/generated/prisma/client";
import { createCalendarSpecialDayAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function NewOfficialHolidayPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Resmi Tatil</p><h1 className={styles.title}>Resmi Tatil Ekle</h1></div>
        <BackLink href="/dashboard/calendar/official-holidays" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarSpecialDayAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/official-holidays" />
          <input type="hidden" name="specialDayType" value={SpecialDayType.OFFICIAL_HOLIDAY} />
          <input type="hidden" name="scopeType" value={CalendarScopeType.COMPANY} />
          <label className={styles.field}><span>Tatil Adi</span><input name="name" required /></label>
          <label className={styles.field}><span>Baslangic</span><input name="dateFrom" type="date" required /></label>
          <label className={styles.field}><span>Bitis</span><input name="dateTo" type="date" required /></label>
          <label className={styles.checkField}><input name="isHalfDay" type="checkbox" /><span>Yarim gun</span></label>
          <label className={styles.field}><span>Yarim Gun Baslangic</span><input name="startTime" type="time" /></label>
          <label className={styles.field}><span>Yarim Gun Bitis</span><input name="endTime" type="time" /></label>
          <label className={styles.checkField}><input name="repeatsYearly" type="checkbox" /><span>Her yil tekrarlar</span></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Resmi Tatil Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
