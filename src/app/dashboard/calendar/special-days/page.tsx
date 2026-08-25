import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecialDayType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDate, scopeLabels, specialDayTypeLabels } from "../calendar-labels";

export default async function CalendarSpecialDaysPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const records = await prisma.calendarSpecialDay.findMany({
    where: {
      companyId: user.companyId,
      specialDayType: { not: SpecialDayType.OFFICIAL_HOLIDAY },
      ...(query ? { name: { contains: query } } : {}),
    },
    include: { branch: true, department: true, employee: true },
    orderBy: { dateFrom: "desc" },
    take: 200,
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Sirket Ozel Gunleri</h1>
          <p className={styles.subtitle}>Ozel gunleri ara, tablo uzerinden listele ve detay ekraninda duzenle.</p>
        </div>
        <Link href="/dashboard/calendar/special-days/new" className={styles.primaryLinkButton}>Ozel Gun Ekle</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Ozel gun ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Kayit</th><th>Tarih</th><th>Kapsam</th><th>Saat</th><th>Durum</th><th>Islem</th></tr></thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : records.map((record) => {
                const scopeName = record.branch?.name ?? record.department?.name ?? (record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : "-");
                return (
                  <tr key={record.id}>
                    <td>{record.name}<p className={styles.tableSubText}>{specialDayTypeLabels[record.specialDayType]}</p></td>
                    <td>{formatDate(record.dateFrom)} - {formatDate(record.dateTo)}</td>
                    <td>{scopeLabels[record.scopeType]}<p className={styles.tableSubText}>{scopeName}</p></td>
                    <td>{record.startTime ?? "-"} / {record.endTime ?? "-"}</td>
                    <td>{record.isActive ? "Aktif" : "Pasif"}</td>
                    <td><Link href={`/dashboard/calendar/special-days/${record.id}`} className={styles.inlineAction}>Incele</Link></td>
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
