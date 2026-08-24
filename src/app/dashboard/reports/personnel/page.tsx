import { redirect } from "next/navigation";
import { ExportButton } from "@/app/dashboard/export-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { getPdksReportData } from "../report-data";

export default async function PersonnelReportPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const { employeeRows } = await getPdksReportData(user.companyId);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personel Bazli</p>
          <h1 className={styles.title}>Ise Gidip Gelme Raporu</h1>
          <p className={styles.subtitle}>
            Personel bazli giris, cikis, onayli izin ve dikkat gerektiren durumlari gor.
          </p>
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
          className={styles.primaryLinkButton}
        />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
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
    </div>
  );
}
