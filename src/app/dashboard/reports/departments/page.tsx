import { redirect } from "next/navigation";
import { ExportButton } from "@/app/dashboard/export-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { getPdksReportData } from "../report-data";

export default async function DepartmentReportPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const { departmentRows } = await getPdksReportData(user.companyId);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Departman Bazli</p>
          <h1 className={styles.title}>Departman Puantaj Raporu</h1>
          <p className={styles.subtitle}>
            Departman bazli giris, izin, hareket yok ve gec kalma oranlarini gor.
          </p>
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
          className={styles.primaryLinkButton}
        />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
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
