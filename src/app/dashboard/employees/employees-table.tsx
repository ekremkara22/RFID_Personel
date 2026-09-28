"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ExportButton } from "@/app/dashboard/export-button";
import ui from "../management.module.css";

type EmployeeRow = {
  id: number;
  photoUrl: string;
  fullName: string;
  registrationNumber: string;
  age: number;
  companyName: string;
  department: string;
  branch: string;
  hireDate: string;
  terminationDate: string;
  managerName: string;
  rfidCardId: string;
  email: string;
  status: string;
};

export function EmployeesTable({ employees, canExport }: { employees: EmployeeRow[]; canExport: boolean }) {
  const exportRows = employees.map((employee) => ({
    fullName: employee.fullName,
    registrationNumber: employee.registrationNumber,
    rfidCardId: employee.rfidCardId,
    companyName: employee.companyName,
    branch: employee.branch,
    department: employee.department,
    hireDate: employee.hireDate,
    terminationDate: employee.terminationDate,
    managerName: employee.managerName,
    email: employee.email,
    status: employee.status,
  }));

  return (
    <>
      <div className={ui.tableToolbar}>
        <p className={ui.tableHint}>Temel bilgiler tek bakışta okunacak şekilde gruplandı.</p>
        {canExport ? (
          <ExportButton
            rows={exportRows}
            columns={[
              { key: "fullName", label: "Ad Soyad" },
              { key: "registrationNumber", label: "Sicil No" },
              { key: "rfidCardId", label: "RFID Kart ID" },
              { key: "companyName", label: "Firma" },
              { key: "branch", label: "Şube" },
              { key: "department", label: "Departman" },
              { key: "hireDate", label: "İşe Giriş" },
              { key: "terminationDate", label: "Ayrılış" },
              { key: "managerName", label: "Bağlı Yönetici" },
              { key: "email", label: "E-posta" },
              { key: "status", label: "Durum" },
            ]}
            filename="personeller"
            className={ui.secondaryAction}
            label="Excel'e Aktar"
          />
        ) : null}
      </div>

      <div className={ui.tableViewport}>
        <table className={ui.dataTable}>
          <colgroup><col style={{ width: "23%" }} /><col style={{ width: "14%" }} /><col style={{ width: "18%" }} /><col style={{ width: "15%" }} /><col style={{ width: "12%" }} /><col style={{ width: "9%" }} /><col style={{ width: "9%" }} /></colgroup>
          <thead><tr><th>Personel</th><th>Sicil / RFID</th><th>Organizasyon</th><th>İstihdam</th><th>Yönetici</th><th>Durum</th><th>İşlem</th></tr></thead>
          <tbody>
            {employees.length === 0 ? <tr><td colSpan={7} className={ui.emptyCell}>Filtrelere uygun personel bulunamadı.</td></tr> : employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className={ui.identity}>
                    <span className={ui.avatar}>
                      {employee.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={employee.photoUrl} alt="" />
                      ) : employee.fullName.slice(0, 1).toLocaleUpperCase("tr-TR")}
                    </span>
                    <span>
                      <strong className={ui.primaryText}>{employee.fullName}</strong>
                      <span className={ui.secondaryText}>{employee.email} · {employee.age} yaş</span>
                    </span>
                  </div>
                </td>
                <td><strong className={ui.primaryText}>{employee.registrationNumber}</strong><span className={ui.secondaryText}><span className={ui.monoText}>{employee.rfidCardId}</span></span></td>
                <td><strong className={ui.primaryText}>{employee.department}</strong><span className={ui.secondaryText}>{employee.branch}</span></td>
                <td><strong className={ui.primaryText}>{employee.hireDate}</strong><span className={ui.secondaryText}>Ayrılış: {employee.terminationDate}</span></td>
                <td>{employee.managerName}</td>
                <td><span className={employee.status === "Aktif" ? ui.statusBadge : ui.statusWarning}><span className={ui.statusDot} />{employee.status}</span></td>
                <td><Link href={`/dashboard/employees/${employee.id}`} className={ui.rowAction} aria-label={`${employee.fullName} kaydını incele`}>İncele <ArrowUpRight size={14} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
