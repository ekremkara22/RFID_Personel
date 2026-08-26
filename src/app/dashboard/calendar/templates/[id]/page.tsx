import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { WorkDayType } from "@/generated/prisma/client";
import { deleteWorkCalendarTemplateAction, updateWorkCalendarTemplateAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { parseRouteId } from "@/lib/ids";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { dayTypeLabels, formatDateInput, weekdayLabels } from "../../calendar-labels";

export default async function CalendarTemplateDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const id = parseRouteId((await props.params).id);
  const template = await prisma.workCalendarTemplate.findFirst({
    where: { id, companyId: user.companyId },
    include: { weekdays: { orderBy: { weekday: "asc" } } },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Takvim Sablonu</p>
          <h1 className={styles.title}>{template.name}</h1>
          <p className={styles.subtitle}>Haftalik calisma planini, kontrolleri ve varsayilan durumunu duzenleyin.</p>
        </div>
        <BackLink href="/dashboard/calendar/templates" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateWorkCalendarTemplateAction} className={styles.formGrid}>
          <input type="hidden" name="templateId" value={template.id} />
          <label className={styles.field}>
            <span>Sablon Adi</span>
            <input name="name" defaultValue={template.name} required />
          </label>
          <label className={styles.field}>
            <span>Sablon Kodu</span>
            <input name="code" defaultValue={template.code} required />
          </label>
          <label className={styles.field}>
            <span>Gecerlilik Baslangici</span>
            <input name="validFrom" type="date" defaultValue={formatDateInput(template.validFrom)} />
          </label>
          <label className={styles.field}>
            <span>Gecerlilik Bitisi</span>
            <input name="validTo" type="date" defaultValue={formatDateInput(template.validTo)} />
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Aciklama</span>
            <textarea name="description" defaultValue={template.description ?? ""} />
          </label>
          <label className={styles.checkField}>
            <input name="isDefault" type="checkbox" defaultChecked={template.isDefault} />
            <span>Firma varsayilan takvimi</span>
          </label>
          <label className={styles.checkField}>
            <input name="isActive" type="checkbox" defaultChecked={template.isActive} />
            <span>Aktif</span>
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Degisiklik Nedeni</span>
            <input name="changeReason" placeholder="Ornek: 2026 calisma saatleri guncellendi" />
          </label>

          <div className={`${styles.tableWrap} ${styles.fullWidth}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gun</th>
                  <th>Durum</th>
                  <th>Giris</th>
                  <th>Cikis</th>
                  <th>Mola Baslangic</th>
                  <th>Mola Bitis</th>
                  <th>Mola dk</th>
                  <th>Gece</th>
                  <th>Kontroller</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(weekdayLabels).map(([weekday, label]) => {
                  const day = template.weekdays.find((item) => item.weekday === Number(weekday));

                  return (
                    <tr key={weekday}>
                      <td>{label}</td>
                      <td>
                        <select name={`weekday-${weekday}-dayType`} defaultValue={day?.dayType ?? WorkDayType.NON_WORKING}>
                          {[WorkDayType.NORMAL_WORK, WorkDayType.WEEKLY_REST, WorkDayType.NON_WORKING].map((type) => (
                            <option key={type} value={type}>{dayTypeLabels[type]}</option>
                          ))}
                        </select>
                      </td>
                      <td><input name={`weekday-${weekday}-startTime`} type="time" defaultValue={day?.startTime ?? ""} /></td>
                      <td><input name={`weekday-${weekday}-endTime`} type="time" defaultValue={day?.endTime ?? ""} /></td>
                      <td><input name={`weekday-${weekday}-breakStartTime`} type="time" defaultValue={day?.breakStartTime ?? ""} /></td>
                      <td><input name={`weekday-${weekday}-breakEndTime`} type="time" defaultValue={day?.breakEndTime ?? ""} /></td>
                      <td><input name={`weekday-${weekday}-breakMinutes`} type="number" defaultValue={day?.breakMinutes ?? 0} /></td>
                      <td><input name={`weekday-${weekday}-crossesMidnight`} type="checkbox" defaultChecked={day?.crossesMidnight ?? false} /></td>
                      <td>
                        <label><input name={`weekday-${weekday}-checkLateArrival`} type="checkbox" defaultChecked={day?.checkLateArrival ?? false} /> Gec</label>
                        <label><input name={`weekday-${weekday}-checkEarlyDeparture`} type="checkbox" defaultChecked={day?.checkEarlyDeparture ?? false} /> Erken</label>
                        <label><input name={`weekday-${weekday}-checkAbsence`} type="checkbox" defaultChecked={day?.checkAbsence ?? false} /> Devamsiz</label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Sablonu Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
          </div>
        </form>
        <form action={deleteWorkCalendarTemplateAction} className={styles.dangerForm}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/templates" />
          <input type="hidden" name="templateId" value={template.id} />
          <SubmitButton idleLabel="Sablonu Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
        </form>
      </section>
    </div>
  );
}
