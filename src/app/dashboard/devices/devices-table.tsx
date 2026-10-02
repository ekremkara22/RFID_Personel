"use client";

import { ReorderableDataTable, type DataTableColumn, type DataTableRow } from "@/app/dashboard/reorderable-data-table";

const columns: DataTableColumn[] = [
  { id: "device", label: "Cihaz", valueKey: "name", secondaryKey: "code", kind: "stack" },
  { id: "company", label: "Firma / Şube", valueKey: "company", secondaryKey: "branch", kind: "stack" },
  { id: "mac", label: "MAC Adresi", valueKey: "macAddress", kind: "mono" },
  { id: "secret", label: "Secret Key", valueKey: "secretKey", kind: "mono" },
  { id: "lastSeen", label: "Son Görülme", valueKey: "lastSeen" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export function DevicesTable({ rows, canExport }: { rows: DataTableRow[]; canExport: boolean }) {
  return <ReorderableDataTable
    rows={rows}
    columns={columns}
    storageKey="rfid-personel-columns-devices-v1"
    filename="rfid-cihazlari"
    emptyMessage="Filtrelere uygun RFID cihazı bulunamadı."
    canExport={canExport}
    minWidth={920}
  />;
}
