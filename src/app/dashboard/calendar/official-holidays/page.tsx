import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarScopeType, SpecialDayType } from "@/generated/prisma/client";
import { createCalendarSpecialDayAction, updateCalendarSpecialDayAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDate, formatDateInput, scopeLabels, specialDayTypeLabels } from "../calendar-labels";

export default async function OfficialHolidaysPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const holidays = await prisma.calendarSpecialDay.findMany({
    where: {
      companyId: user.companyId,
      specialDayType: SpecialDayType.OFFICIAL_HOLIDAY,
      ...(query ? { name: { contains: query } } : {}),
    },
    orderBy: { dateFrom: "asc" },
    take: 200,
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Resmi Tatiller</h1>
          <p className={styles.subtitle}>
            Resmi tatillerde kart okutulmasa devamsizlik uretilmez; okutma olursa hareket saklanip resmi tatilde calisma olarak raporlanir.
          </p>
        </div>
        <Link href="#new-record" className={styles.primaryLinkButton}>Resmi Tatil Ekle</Link>
      </section>

      <section id="new-record" className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarSpecialDayAction} className={styles.formGrid}>
          <input type="hidden" name="specialDayType" value={SpecialDayType.OFFICIAL_HOLIDAY} />
          <input type="hidden" name="scopeType" value={CalendarScopeType.COMPANY} />
          <label className={styles.field}>
            <span>Tatil Adi</span>
            <input name="name" placeholder="Cumhuriyet Bayrami" required />
          </label>
          <label className={styles.field}>
            <span>Baslangic</span>
            <input name="dateFrom" type="date" required />
          </label>
          <label className={styles.field}>
            <span>Bitis</span>
            <input name="dateTo" type="date" required />
          </label>
          <label className={styles.checkboxField}>
            <input name="isHalfDay" type="checkbox" />
            <span>Yarim gun</span>
          </label>
          <label className={styles.field}>
            <span>Yarim Gun Baslangic</span>
            <input name="startTime" type="time" />
          </label>
          <label className={styles.field}>
            <span>Yarim Gun Bitis</span>
            <input name="endTime" type="time" />
          </label>
          <label className={styles.checkboxField}>
            <input name="repeatsYearly" type="checkbox" />
            <span>Her yil tekrarlar</span>
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Aciklama</span>
            <textarea name="description" />
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Resmi Tatil Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Resmi tatil ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tatil</th>
                <th>Tarih</th>
                <th>Kapsam</th>
                <th>Durum</th>
                <th>Incele</th>
                <th>Guncelle</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Henuz resmi tatil kaydi yok.</td></tr>
              ) : holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td>{holiday.name}<p className={styles.tableSubText}>{specialDayTypeLabels[holiday.specialDayType]}</p></td>
                  <td>{formatDate(holiday.dateFrom)} - {formatDate(holiday.dateTo)}</td>
                  <td>{scopeLabels[holiday.scopeType]}</td>
                  <td>{holiday.isActive ? "Aktif" : "Pasif"}</td>
                  <td><Link href={`/dashboard/calendar/special-days/${holiday.id}`} className={styles.inlineAction}>Incele</Link></td>
                  <td>
                    <form action={updateCalendarSpecialDayAction} className={styles.inlineEditForm}>
                      <input type="hidden" name="specialDayId" value={holiday.id} />
                      <input type="hidden" name="specialDayType" value={SpecialDayType.OFFICIAL_HOLIDAY} />
                      <input type="hidden" name="scopeType" value={CalendarScopeType.COMPANY} />
                      <input name="name" defaultValue={holiday.name} required />
                      <input name="dateFrom" type="date" defaultValue={formatDateInput(holiday.dateFrom)} required />
                      <input name="dateTo" type="date" defaultValue={formatDateInput(holiday.dateTo)} required />
                      <input name="startTime" type="time" defaultValue={holiday.startTime ?? ""} />
                      <input name="endTime" type="time" defaultValue={holiday.endTime ?? ""} />
                      <label><input name="isHalfDay" type="checkbox" defaultChecked={holiday.isHalfDay} /> Yarim</label>
                      <label><input name="repeatsYearly" type="checkbox" defaultChecked={holiday.repeatsYearly} /> Tekrar</label>
                      <label><input name="isActive" type="checkbox" defaultChecked={holiday.isActive} /> Aktif</label>
                      <input name="changeReason" placeholder="Degisiklik nedeni" />
                      <SubmitButton idleLabel="Kaydet" pendingLabel="..." className={styles.smallButton} />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
