import { redirect } from "next/navigation";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { ExportButton } from "@/app/dashboard/export-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

function getMonthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function ReportsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const monthStart = getMonthStart();
  const [employees, logs, leaves] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ department: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: monthStart },
        employee: { companyId: user.companyId },
      },
      include: { employee: true },
      take: 2000,
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId: user.companyId,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        endDate: { gte: monthStart },
      },
      include: { employee: true },
    }),
  ]);

  const employeeRows = employees.map((employee) => {
    const employeeLogs = logs.filter((log) => log.employeeId === employee.id);
    const entryCount = employeeLogs.filter((log) => log.type === "ENTRY").length;
    const exitCount = employeeLogs.filter((log) => log.type === "EXIT").length;
    const leaveCount = leaves.filter((leave) => leave.employeeId === employee.id).length;

    return {
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department,
      branch: employee.branch ?? "-",
      entryCount,
      exitCount,
      leaveCount,
      lateRate: "0%",
      attention: entryCount === 0 && leaveCount === 0 ? "Hareket yok" : "Normal",
    };
  });

  const departmentRows = Array.from(
    employeeRows.reduce((map, row) => {
      const current = map.get(row.department) ?? {
        department: row.department,
        employeeCount: 0,
        entryCount: 0,
        leaveCount: 0,
        noMovementCount: 0,
        lateRate: "0%",
      };

      current.employeeCount += 1;
      current.entryCount += row.entryCount;
      current.leaveCount += row.leaveCount;
      if (row.attention === "Hareket yok") current.noMovementCount += 1;
      map.set(row.department, current);
      return map;
    }, new Map<string, { department: string; employeeCount: number; entryCount: number; leaveCount: number; noMovementCount: number; lateRate: string }>()),
  ).map(([, row]) => row);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Raporlar</p>
          <h1 className={styles.title}>PDKS Rapor Merkezi</h1>
          <p className={styles.subtitle}>
            Personel ve departman bazli ise gidip gelme, izin, devamsizlik ve dikkat gerektiren durum ozetleri.
          </p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Personel Bazli</p>
            <h2 className={styles.sectionTitle}>Ise Gidip Gelme Raporu</h2>
          </div>
          <ExportButton
            rows={employeeRows}
            columns={[
              { key: "employee", label: "Personel" },
              { key: "department", label: "Departman" },
              { key: "branch", label: "Sube" },
              { key: "entryCount", label: "Giris Sayisi" },
              { key: "exitCount", label: "Cikis Sayisi" },
              { key: "leaveCount", label: "Onayli Izin" },
              { key: "lateRate", label: "Gec Kalma Orani" },
              { key: "attention", label: "Dikkat" },
            ]}
            filename="personel-pdks-raporu"
            className={styles.inlineAction}
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Departman</th>
                <th>Sube</th>
                <th>Giris</th>
                <th>Cikis</th>
                <th>Onayli Izin</th>
                <th>Gec Kalma</th>
                <th>Dikkat</th>
              </tr>
            </thead>
            <tbody>
              {employeeRows.map((row) => (
                <tr key={row.employee}>
                  <td>{row.employee}</td>
                  <td>{row.department}</td>
                  <td>{row.branch}</td>
                  <td>{row.entryCount}</td>
                  <td>{row.exitCount}</td>
                  <td>{row.leaveCount}</td>
                  <td>{row.lateRate}</td>
                  <td>{row.attention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Departman Bazli</p>
            <h2 className={styles.sectionTitle}>Departman Puantaj Ozeti</h2>
          </div>
          <ExportButton
            rows={departmentRows}
            columns={[
              { key: "department", label: "Departman" },
              { key: "employeeCount", label: "Personel" },
              { key: "entryCount", label: "Giris" },
              { key: "leaveCount", label: "Onayli Izin" },
              { key: "noMovementCount", label: "Hareket Yok" },
              { key: "lateRate", label: "Gec Kalma Orani" },
            ]}
            filename="departman-pdks-raporu"
            className={styles.inlineAction}
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Departman</th>
                <th>Personel</th>
                <th>Giris</th>
                <th>Onayli Izin</th>
                <th>Hareket Yok</th>
                <th>Gec Kalma</th>
              </tr>
            </thead>
            <tbody>
              {departmentRows.map((row) => (
                <tr key={row.department}>
                  <td>{row.department}</td>
                  <td>{row.employeeCount}</td>
                  <td>{row.entryCount}</td>
                  <td>{row.leaveCount}</td>
                  <td>{row.noMovementCount}</td>
                  <td>{row.lateRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
