"use client";

import { useState } from "react";
import styles from "./page.module.css";

export type TopLateEmployeeRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  count: number;
  totalMinutes: number;
};

export function TopLateEmployees({
  weeklyRows,
  monthlyRows,
}: {
  weeklyRows: TopLateEmployeeRow[];
  monthlyRows: TopLateEmployeeRow[];
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const rows = period === "week" ? weeklyRows : monthlyRows;

  return (
    <div className={styles.topLateBlock}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Puantaj dikkati</p>
          <h2 className={styles.sectionTitle}>En Cok Gec Kalan Personel</h2>
        </div>
        <div className={styles.segmentedControl}>
          <button type="button" onClick={() => setPeriod("week")} className={period === "week" ? styles.segmentActive : styles.segmentLink}>Haftalik</button>
          <button type="button" onClick={() => setPeriod("month")} className={period === "month" ? styles.segmentActive : styles.segmentLink}>Aylik</button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Personel</th>
              <th>Departman</th>
              <th>Gec Kalma Sayisi</th>
              <th>Toplam Gecikme</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyCell}>Secili donemde gec kalma kaydi yok.</td></tr>
            ) : rows.map((employee) => (
              <tr key={employee.employeeId}>
                <td>{employee.employeeName}</td>
                <td>{employee.department}</td>
                <td>{employee.count}</td>
                <td>{employee.totalMinutes} dk</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
