import { redirect } from "next/navigation";
import { CalendarCalculationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { calculationStatusLabels, dayTypeLabels, formatDate } from "../calendar-labels";

export default async function CalendarConflictsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const [dailyConflicts, assignmentConflicts] = await Promise.all([
    prisma.employeeDailyCalendar.findMany({
      where: {
        calculationStatus: { in: [CalendarCalculationStatus.CONFLICT, CalendarCalculationStatus.MISSING_DEFAULT] },
        employee: { companyId: user.companyId },
      },
      include: { employee: true },
      orderBy: { workDate: "desc" },
      take: 200,
    }),
    prisma.calendarAssignment.findMany({
      where: { companyId: user.companyId, conflictApproved: true },
      include: { calendarTemplate: true, branch: true, department: true, employee: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Takvim Cakismalari</h1>
          <p className={styles.subtitle}>
            Kural motorunun otomatik karar veremedigi personel-gun kayitlari ve onaylanmis cakisan atamalari burada izleyin.
          </p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Personel-Gun</p>
            <h2 className={styles.sectionTitle}>Hesaplama Cakismalari</h2>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Personel</th>
                <th>Gun Turu</th>
                <th>Durum</th>
                <th>Kural</th>
                <th>Gerekce</th>
              </tr>
            </thead>
            <tbody>
              {dailyConflicts.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Hesaplama cakismasi yok.</td></tr>
              ) : dailyConflicts.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.workDate)}</td>
                  <td>{record.employee.firstName} {record.employee.lastName}</td>
                  <td>{dayTypeLabels[record.dayType]}</td>
                  <td>{calculationStatusLabels[record.calculationStatus]}</td>
                  <td>{record.ruleSourceType}</td>
                  <td>{record.calculationReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Atamalar</p>
            <h2 className={styles.sectionTitle}>Onaylanmis Cakismali Atamalar</h2>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sablon</th>
                <th>Kapsam</th>
                <th>Tarih</th>
                <th>Neden</th>
              </tr>
            </thead>
            <tbody>
              {assignmentConflicts.length === 0 ? (
                <tr><td colSpan={4} className={styles.emptyCell}>Onaylanmis cakismali atama yok.</td></tr>
              ) : assignmentConflicts.map((assignment) => {
                const scopeName = assignment.branch?.name
                  ?? assignment.department?.name
                  ?? (assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : "Sirket geneli");

                return (
                  <tr key={assignment.id}>
                    <td>{assignment.calendarTemplate.name}</td>
                    <td>{assignment.scopeType}<p className={styles.tableSubText}>{scopeName}</p></td>
                    <td>{formatDate(assignment.validFrom)} - {assignment.validTo ? formatDate(assignment.validTo) : "-"}</td>
                    <td>{assignment.conflictReason ?? "-"}</td>
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
