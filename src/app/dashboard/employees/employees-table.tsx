"use client";

import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";

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

const columns: DataTableColumn[] = [
  { id: "employee", label: "Personel", valueKey: "fullName", secondaryKey: "employeeDetail", imageKey: "photoUrl", kind: "person" },
  { id: "identity", label: "Sicil / RFID", valueKey: "registrationNumber", secondaryKey: "rfidCardId", kind: "stack" },
  { id: "organization", label: "Organizasyon", valueKey: "department", secondaryKey: "branch", kind: "stack" },
  { id: "employment", label: "İstihdam", valueKey: "hireDate", secondaryKey: "terminationText", kind: "stack" },
  { id: "manager", label: "Yönetici", valueKey: "managerName" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export function EmployeesTable({ employees, canExport }: { employees: EmployeeRow[]; canExport: boolean }) {
  const rows = employees.map((employee) => ({
    ...employee,
    employeeDetail: `${employee.email} · ${employee.age} yaş`,
    terminationText: `Ayrılış: ${employee.terminationDate}`,
    statusTone: employee.status === "Aktif" ? "success" : "warning",
    actionLabel: "İncele",
    actionHref: `/dashboard/employees/${employee.id}`,
  }));

  return <ReorderableDataTable
    rows={rows}
    columns={columns}
    storageKey="rfid-personel-columns-employees-v2"
    filename="personeller"
    emptyMessage="Filtrelere uygun personel bulunamadı."
    canExport={canExport}
    minWidth={900}
  />;
}
