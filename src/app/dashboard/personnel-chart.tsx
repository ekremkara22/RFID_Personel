"use client";

import { useState } from "react";
import styles from "./page.module.css";

type PersonnelRow = {
  employeeId: number;
  employeeName: string;
  department: string;
  lateMinutes: number;
  breakMinutes: number;
};

export function PersonnelChart({ rows }: { rows: PersonnelRow[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * 20, currentPage * 20 + 20);
  const maxMinutes = Math.max(1, ...rows.map((row) => row.lateMinutes + row.breakMinutes));

  if (!rows.length) return <p className={styles.emptyState}>Personel bulunamadı.</p>;

  return (
    <div>
      <div className={styles.personnelColumns}>
        {[visibleRows.slice(0, 10), visibleRows.slice(10, 20)].map((column, index) => (
          <div key={index} className={styles.operationPersonList}>
            {column.map((row) => (
              <article key={row.employeeId} className={styles.operationPersonRow}>
                <div className={styles.operationPersonIdentity}>
                  <strong title={row.employeeName}>{row.employeeName}</strong>
                  <small>{row.department}</small>
                </div>
                <div className={styles.operationComparisonTrack}>
                  <span className={styles.operationLateBar} style={{ width: `${row.lateMinutes / maxMinutes * 100}%` }} />
                  <span className={styles.operationBreakBar} style={{ width: `${row.breakMinutes / maxMinutes * 100}%` }} />
                </div>
                <b className={styles.operationLateValue} aria-label={`Geç kalma: ${row.lateMinutes} dakika`}>{row.lateMinutes} dk</b>
                <b className={styles.operationBreakValue} aria-label={`Mola: ${row.breakMinutes} dakika`}>{row.breakMinutes} dk</b>
              </article>
            ))}
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <nav className={styles.personnelPagination} aria-label="Personel sayfaları">
          <span aria-live="polite">{currentPage * 20 + 1}–{Math.min((currentPage + 1) * 20, rows.length)} / {rows.length} personel · Sayfa {currentPage + 1}/{pageCount}</span>
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Önceki</button>
          <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Sonraki</button>
        </nav>
      )}
    </div>
  );
}
