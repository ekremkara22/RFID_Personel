import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkDayType } from "@/generated/prisma/client";
import { createWorkCalendarTemplateAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { dayTypeLabels, formatDateInput, formatPlannedDuration, weekdayLabels } from "../calendar-labels";

const defaultDayTypes: Record<number, WorkDayType> = {
  1: WorkDayType.NORMAL_WORK,
  2: WorkDayType.NORMAL_WORK,
  3: WorkDayType.NORMAL_WORK,
  4: WorkDayType.NORMAL_WORK,
  5: WorkDayType.NORMAL_WORK,
  6: WorkDayType.WEEKLY_REST,
  7: WorkDayType.WEEKLY_REST,
};

export default async function CalendarTemplatesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const templates = await prisma.workCalendarTemplate.findMany({
    where: {
      companyId: user.companyId,
      ...(query ? { OR: [{ name: { contains: query } }, { code: { contains: query } }] } : {}),
    },
    include: { weekdays: { orderBy: { weekday: "asc" } }, _count: { select: { assignments: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Takvim Sablonlari</h1>
          <p className={styles.subtitle}>
            Genel merkez, beyaz yaka, uretim, 5 gun veya 6 gun calisma gibi haftalik calisma kurallarini tanimlayin.
          </p>
        </div>
        <Link href="#new-record" className={styles.primaryLinkButton}>Sablon Ekle</Link>
      </section>

      <section id="new-record" className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Yeni Sablon</p>
            <h2 className={styles.sectionTitle}>Haftalik Calisma Kurali</h2>
          </div>
        </div>

        <form action={createWorkCalendarTemplateAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Sablon Adi</span>
            <input name="name" placeholder="Uretim Takvimi" required />
          </label>
          <label className={styles.field}>
            <span>Sablon Kodu</span>
            <input name="code" placeholder="URETIM" required />
          </label>
          <label className={styles.field}>
            <span>Gecerlilik Baslangici</span>
            <input name="validFrom" type="date" />
          </label>
          <label className={styles.field}>
            <span>Gecerlilik Bitisi</span>
            <input name="validTo" type="date" />
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Aciklama</span>
            <textarea name="description" placeholder="Bu sablonun hangi ekiplerde kullanilacagini yazin." />
          </label>
          <label className={styles.checkboxField}>
            <input name="isDefault" type="checkbox" />
            <span>Firma varsayilan takvimi</span>
          </label>

          <div className={`${styles.tableWrap} ${styles.fullWidth}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gun</th>
                  <th>Durum</th>
                  <th>Giris</th>
                  <th>Cikis</th>
                  <th>Mola dk</th>
                  <th>Gece</th>
                  <th>Kontroller</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(weekdayLabels).map(([weekday, label]) => {
                  const weekdayNumber = Number(weekday);
                  const isWorkDay = defaultDayTypes[weekdayNumber] === WorkDayType.NORMAL_WORK;

                  return (
                    <tr key={weekday}>
                      <td>{label}</td>
                      <td>
                        <select name={`weekday-${weekday}-dayType`} defaultValue={defaultDayTypes[weekdayNumber]}>
                          {[WorkDayType.NORMAL_WORK, WorkDayType.WEEKLY_REST, WorkDayType.NON_WORKING].map((type) => (
                            <option key={type} value={type}>{dayTypeLabels[type]}</option>
                          ))}
                        </select>
                      </td>
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

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Kayitlar</p>
            <h2 className={styles.sectionTitle}>Takvim Sablonlari</h2>
          </div>
        </div>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Sablon adi veya kodu ara" />
            <button type="submit">Ara</button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Gecerlilik</th>
                <th>Atama</th>
                <th>Durum</th>
                <th>Incele</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Henuz takvim sablonu yok.</td></tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.code}</td>
                    <td>
                      {template.name}
                      <p className={styles.tableSubText}>
                        {template.weekdays.filter((day) => day.plannedNetMinutes > 0).length} calisma gunu,
                        {" "}{formatPlannedDuration(template.weekdays.reduce((sum, day) => sum + day.plannedNetMinutes, 0))} haftalik net
                      </p>
                    </td>
                    <td>{formatDateInput(template.validFrom) || "-"} / {formatDateInput(template.validTo) || "-"}</td>
                    <td>{template._count.assignments}</td>
                    <td>{template.isDefault ? "Varsayilan" : template.isActive ? "Aktif" : "Pasif"}</td>
                    <td>
                      <Link className={styles.inlineAction} href={`/dashboard/calendar/templates/${template.id}`}>Incele</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
