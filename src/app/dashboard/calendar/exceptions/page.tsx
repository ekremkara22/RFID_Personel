import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { approvalLabels, dayTypeLabels, formatDate, scopeLabels } from "../calendar-labels";

export default async function CalendarExceptionsPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().toLocaleLowerCase("tr-TR") : "";
  const exceptions = await prisma.calendarDailyException.findMany({
    where: { companyId: user.companyId },
    include: { branch: true, department: true, employee: true },
    orderBy: { workDate: "desc" },
    take: 300,
  });
  const filteredExceptions = query
    ? exceptions.filter((exception) => {
        const scopeName = exception.branch?.name
          ?? exception.department?.name
          ?? (exception.employee ? `${exception.employee.firstName} ${exception.employee.lastName}` : "Sirket geneli");
        return [
          exception.changeReason,
          scopeLabels[exception.scopeType],
          scopeName,
          dayTypeLabels[exception.newDayType],
          approvalLabels[exception.approvalStatus],
        ].some((value) => value?.toLocaleLowerCase("tr-TR").includes(query));
      })
    : exceptions;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Gunluk Istisnalar</h1>
          <p className={styles.subtitle}>Belirli bir tarih icin tanimlanan calisma istisnalarini listeleyin.</p>
        </div>
        <Link href="/dashboard/calendar/exceptions/new" className={styles.primaryLinkButton}>Istisna Ekle</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Kapsam, durum veya neden ara" />
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
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {filteredExceptions.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Gunluk istisna bulunamadi.</td></tr>
              ) : filteredExceptions.map((exception) => {
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
