"use client";

import { ReorderableDataTable, type DataTableColumn, type DataTableRow } from "@/app/dashboard/reorderable-data-table";

const columns: DataTableColumn[] = [
  { id: "device", label: "Cihaz / Firma", valueKey: "name", secondaryKey: "organization", kind: "stack" },
  { id: "connection", label: "Bağlantı", valueKey: "connection", secondaryKey: "lastSeen", toneKey: "connectionTone", kind: "status" },
  { id: "queue", label: "Bekleyen Kayıt", valueKey: "pending", secondaryKey: "oldestQueued", kind: "stack" },
  { id: "clock", label: "Saat Durumu", valueKey: "clock", secondaryKey: "clockOffset", toneKey: "clockTone", kind: "status" },
  { id: "transfer", label: "Son Aktarım", valueKey: "lastTransfer" },
  { id: "error", label: "Son Hata", valueKey: "lastError", toneKey: "errorTone", kind: "status" },
  { id: "firmware", label: "Firmware", valueKey: "firmware", secondaryKey: "healthReported", kind: "stack" },
];

export function DeviceHealthTable({ rows, canExport }: { rows: DataTableRow[]; canExport: boolean }) {
  return <ReorderableDataTable
    rows={rows}
    columns={columns}
    storageKey="rfid-personel-columns-device-health-v1"
    filename="cihaz-sagligi"
    emptyMessage="Atanmış RFID cihazı bulunamadı."
    canExport={canExport}
    minWidth={1120}
  />;
}
