import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkDayType } from "@/generated/prisma/client";
import { createWorkCalendarTemplateAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { dayTypeLabels, weekdayLabels } from "../../calendar-labels";

const defaultDayTypes: Record<number, WorkDayType> = {
  1: WorkDayType.NORMAL_WORK,
  2: WorkDayType.NORMAL_WORK,
  3: WorkDayType.NORMAL_WORK,
  4: WorkDayType.NORMAL_WORK,
  5: WorkDayType.NORMAL_WORK,
  6: WorkDayType.WEEKLY_REST,
  7: WorkDayType.WEEKLY_REST,
};

export default async function NewCalendarTemplatePage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Takvim Sablonu</p>
          <h1 className={styles.title}>Sablon Ekle</h1>
          <p className={styles.subtitle}>Haftanin yedi gunu icin planlanan calisma saatlerini tanimla.</p>
        </div>
        <Link href="/dashboard/calendar/templates" className={styles.inlineAction}>Listeye Don</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createWorkCalendarTemplateAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/templates" />
          <label className={styles.field}><span>Sablon Adi</span><input name="name" placeholder="Uretim Takvimi" required /></label>
          <label className={styles.field}><span>Sablon Kodu</span><input name="code" placeholder="URETIM" required /></label>
          <label className={styles.field}><span>Gecerlilik Baslangici</span><input name="validFrom" type="date" /></label>
          <label className={styles.field}><span>Gecerlilik Bitisi</span><input name="validTo" type="date" /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" /></label>
          <label className={styles.checkField}><input name="isDefault" type="checkbox" /><span>Firma varsayilan takvimi</span></label>

          <div className={`${styles.tableWrap} ${styles.fullWidth}`}>
            <table className={styles.table}>
              <thead><tr><th>Gun</th><th>Durum</th><th>Giris</th><th>Cikis</th><th>Mola dk</th><th>Gece</th><th>Kontroller</th></tr></thead>
              <tbody>
                {Object.entries(weekdayLabels).map(([weekday, label]) => {
                  const weekdayNumber = Number(weekday);
                  const isWorkDay = defaultDayTypes[weekdayNumber] === WorkDayType.NORMAL_WORK;
                  return (
                    <tr key={weekday}>
                      <td>{label}</td>
                      <td><select name={`weekday-${weekday}-dayType`} defaultValue={defaultDayTypes[weekdayNumber]}>{[WorkDayType.NORMAL_WORK, WorkDayType.WEEKLY_REST, WorkDayType.NON_WORKING].map((type) => <option key={type} value={type}>{dayTypeLabels[type]}</option>)}</select></td>
                      <td><input name={`weekday-${weekday}-startTime`} type="time" defaultValue={isWorkDay ? "08:30" : ""} /></td>
                      <td><input name={`weekday-${weekday}-endTime`} type="time" defaultValue={isWorkDay ? "18:00" : ""} /></td>
                      <td><input name={`weekday-${weekday}-breakMinutes`} type="number" defaultValue={isWorkDay ? 60 : 0} /></td>
                      <td><input name={`weekday-${weekday}-crossesMidnight`} type="checkbox" /></td>
                      <td>
                        <label><input name={`weekday-${weekday}-checkLateArrival`} type="checkbox" defaultChecked={isWorkDay} /> Gec</label>
                        <label><input name={`weekday-${weekday}-checkEarlyDeparture`} type="checkbox" defaultChecked={isWorkDay} /> Erken</label>
                        <label><input name={`weekday-${weekday}-checkAbsence`} type="checkbox" defaultChecked={isWorkDay} /> Devamsiz</label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Sablon Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
