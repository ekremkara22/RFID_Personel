import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { PERSONNEL_IMPORT_COLUMNS } from "@/lib/personnel-import";
import { requireSessionUser } from "@/lib/session";
import { EmployeeImportForm } from "./import-form";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import importStyles from "./import.module.css";

const COLUMN_HINTS: Record<string, string> = {
  department: "Departman tanımıyla aynı olmalı",
  position: "Pozisyon tanımıyla aynı olmalı",
  workforceType: "Mavi Yaka veya Beyaz Yaka",
  registrationNumber: "Firmada benzersiz olmalı",
  email: "Sistemde benzersiz olmalı",
  branch: "Tanımlı ve aktif bir şube adı",
  hireDate: "GG.AA.YYYY (ör. 05.01.2026)",
  age: "Boşsa 18 kabul edilir",
  rfidCardId: "Sistemde benzersiz olmalı",
  grossSalary: "Aylık brüt, ör. 45.000,00",
  insuranceType: "5510 Teşvikli, Teşviksiz veya Emekli; boşsa Teşvikli",
};

export default async function EmployeeImportPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.PERSONNEL_CREATE)) redirect("/dashboard/employees");
  const companyWide = authorization.isPlatformAdmin || authorization.scopeMode === "COMPANY";

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Personel yönetimi</p>
          <h1 className={ui.pageTitle}>Toplu Personel Ekle</h1>
          <p className={ui.pageDescription}>Excel veya CSV dosyasındaki personelleri tek seferde ekleyin. Dosya önce bütünüyle kontrol edilir; hatalı satır varsa hiçbir kayıt eklenmez.</p>
        </div>
        <div className={ui.headerActions}><Link href="/dashboard/employees" className={ui.secondaryAction}><ArrowLeft size={16} />Personel listesi</Link></div>
      </header>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>1. Şablonu indirin</h2><p>Başlık satırını değiştirmeden doldurun. Örnek satırları silmeyi unutmayın.</p></div></div>
        <div className={importStyles.templateActions}>
          {/* File downloads from a route handler: client-side <Link> navigation would not save the file. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/dashboard/employees/import/template?format=xlsx" download className={ui.secondaryAction}><FileSpreadsheet size={16} />Excel şablonu (.xlsx)</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/dashboard/employees/import/template?format=csv" download className={ui.secondaryAction}><FileText size={16} />CSV şablonu (.csv)</a>
        </div>
        <div className={ui.tableViewport}>
          <table className={`${ui.dataTable} ${importStyles.columnTable}`}>
            <thead><tr><th>Sütun</th><th>Zorunlu</th><th>Açıklama</th></tr></thead>
            <tbody>
              {PERSONNEL_IMPORT_COLUMNS.map((column) => (
                <tr key={column.key}>
                  <td><span className={ui.primaryText}>{column.label}</span></td>
                  <td>{column.required ? <span className={ui.statusWarning}>Zorunlu</span> : <span className={ui.statusNeutral}>İsteğe bağlı</span>}</td>
                  <td><span className={ui.secondaryText}>{COLUMN_HINTS[column.key] ?? "-"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>2. Dosyayı yükleyin</h2><p>Sicil no, e-posta ve RFID kart numarası hem dosya içinde hem sistemde tekrar kontrol edilir.</p></div></div>
        {companyWide ? <EmployeeImportForm canWriteSalary={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE)} /> : (
          <p className={ui.emptyState}>Toplu içe aktarma için firma genelinde personel yetkisi gerekir. Kısıtlı kapsamda personelleri tek tek ekleyebilirsiniz.</p>
        )}
      </section>
    </div>
  );
}
