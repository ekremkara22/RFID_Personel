"use client";

import { Download } from "lucide-react";

type ExportRow = Record<string, string | number | null | undefined>;

type ExportColumn<T extends ExportRow> = {
  key: keyof T & string;
  label: string;
};

type ExportButtonProps<T extends ExportRow> = {
  columns: ExportColumn<T>[];
  rows: T[];
  filename: string;
  className?: string;
  label?: string;
};

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function ExportButton<T extends ExportRow>({
  columns,
  rows,
  filename,
  className,
  label = "Excel Al",
}: ExportButtonProps<T>) {
  const handleExport = () => {
    const header = columns.map((column) => escapeCsvCell(column.label)).join(";");
    const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column.key])).join(";"));
    const csv = ["\uFEFF" + header, ...body].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" className={className} onClick={handleExport}>
      <Download size={16} />
      <span>{label}</span>
    </button>
  );
}
