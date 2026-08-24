import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDate } from "../calendar-labels";

export default async function CalendarChangeLogsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const logs = await prisma.calendarChangeLog.findMany({
    where: { companyId: user.companyId },
    orderBy: { changedAt: "desc" },
    take: 300,
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Degisiklik Gecmisi</h1>
          <p className={styles.subtitle}>Takvim, tatil, atama, istisna ve hesaplama uretim islerinin audit kayitlari.</p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kayit Turu</th>
                <th>Kayit</th>
                <th>Neden</th>
                <th>Degistiren</th>
                <th>Yeni Deger</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Henuz takvim degisikligi yok.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.changedAt)}</td>
                  <td>{log.recordType}</td>
                  <td>{log.recordId}</td>
                  <td>{log.changeReason ?? "-"}</td>
                  <td>{log.changedById ?? "-"}</td>
                  <td><p className={styles.tableSubText}>{log.newValue ?? "-"}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
