import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteCalendarSpecialDayAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { SpecialDayType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDate, scopeLabels, specialDayTypeLabels } from "../calendar-labels";

export default async function OfficialHolidaysPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

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
          <p className={styles.subtitle}>Resmi tatilleri ara, tablo uzerinden listele ve detay ekraninda duzenle.</p>
        </div>
        <Link href="/dashboard/calendar/official-holidays/new" className={styles.primaryLinkButton}>Resmi Tatil Ekle</Link>
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
            <thead><tr><th>Tatil</th><th>Tarih</th><th>Kapsam</th><th>Durum</th><th>Islem</th><th>Sil</th></tr></thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td>{holiday.name}<p className={styles.tableSubText}>{specialDayTypeLabels[holiday.specialDayType]}</p></td>
                  <td>{formatDate(holiday.dateFrom)} - {formatDate(holiday.dateTo)}</td>
                  <td>{scopeLabels[holiday.scopeType]}</td>
                  <td>{holiday.isActive ? "Aktif" : "Pasif"}</td>
                  <td><Link href={`/dashboard/calendar/special-days/${holiday.id}`} className={styles.inlineAction}>Incele</Link></td>
                  <td>
                    <form action={deleteCalendarSpecialDayAction}>
                      <input type="hidden" name="specialDayId" value={holiday.id} />
                      <input type="hidden" name="returnTo" value="/dashboard/calendar/official-holidays" />
                      <SubmitButton idleLabel="Sil" pendingLabel="..." className={styles.dangerMiniButton} />
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
