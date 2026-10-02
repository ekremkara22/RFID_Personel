"use client";

import { ReorderableDataTable, type DataTableColumn, type DataTableRow } from "@/app/dashboard/reorderable-data-table";

const columns: DataTableColumn[] = [
  { id: "date", label: "Tarih", valueKey: "date" },
  { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "department", kind: "stack" },
  { id: "dayType", label: "Gün Türü", valueKey: "dayType" },
  { id: "plan", label: "Planlanan Saat", valueKey: "plan" },
  { id: "duration", label: "Net Süre", valueKey: "duration" },
  { id: "rule", label: "Kural Kaynağı", valueKey: "rule" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
];

export function CalendarTable({ rows, canExport }: { rows: DataTableRow[]; canExport: boolean }) {
  return <ReorderableDataTable
    rows={rows}
    columns={columns}
    storageKey="rfid-personel-columns-calendar-v1"
    filename="calisma-takvimi"
    emptyMessage="Seçilen filtrelerde hesaplanmış çalışma takvimi kaydı bulunamadı."
    canExport={canExport}
    minWidth={920}
  />;
}
