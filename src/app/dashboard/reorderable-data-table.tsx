"use client";

import Link from "next/link";
import { Download, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ui from "./management.module.css";

export type DataTableValue = string | number | null | undefined;
export type DataTableRow = Record<string, DataTableValue>;

export type DataTableColumn = {
  id: string;
  label: string;
  valueKey: string;
  exportValueKey?: string;
  secondaryKey?: string;
  imageKey?: string;
  hrefKey?: string;
  toneKey?: string;
  exportable?: boolean;
  kind?: "text" | "stack" | "person" | "status" | "mono" | "link";
};

type Props = {
  rows: DataTableRow[];
  columns: DataTableColumn[];
  storageKey: string;
  filename: string;
  emptyMessage: string;
  canExport?: boolean;
  minWidth?: number;
};

function escapeCsvCell(value: DataTableValue) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function initials(value: DataTableValue) {
  return String(value ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

export function ReorderableDataTable({
  rows,
  columns,
  storageKey,
  filename,
  emptyMessage,
  canExport = false,
  minWidth = 860,
}: Props) {
  const [columnOrder, setColumnOrder] = useState(() => columns.map((column) => column.id));
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const savedOrder = window.localStorage.getItem(storageKey);
    if (!savedOrder) return;
    try {
      const parsed = JSON.parse(savedOrder) as string[];
      const validIds = new Set(columns.map((column) => column.id));
      if (parsed.length === columns.length && parsed.every((id) => validIds.has(id))) {
        queueMicrotask(() => setColumnOrder(parsed));
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [columns, storageKey]);

  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map((column) => [column.id, column]));
    return columnOrder.map((id) => byId.get(id)).filter((column): column is DataTableColumn => Boolean(column));
  }, [columnOrder, columns]);

  function moveColumn(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setColumnOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggedId);
      const to = next.indexOf(targetId);
      if (from < 0 || to < 0) return current;
      next.splice(to, 0, next.splice(from, 1)[0]);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  function exportRows() {
    const exportColumns = orderedColumns.filter((column) => column.exportable !== false);
    const header = exportColumns.map((column) => escapeCsvCell(column.label)).join(";");
    const body = rows.map((row) => exportColumns.map((column) => escapeCsvCell(row[column.exportValueKey ?? column.valueKey])).join(";"));
    const blob = new Blob([["\uFEFF" + header, ...body].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderCell(row: DataTableRow, column: DataTableColumn) {
    const value = row[column.valueKey] ?? "—";
    const secondary = column.secondaryKey ? row[column.secondaryKey] : null;
    if (column.kind === "person") {
      const imageUrl = column.imageKey ? row[column.imageKey] : null;
      return <div className={ui.identity}><span className={ui.avatar}>{imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(imageUrl)} alt="" />
      ) : initials(value)}</span><span><strong className={ui.primaryText}>{value}</strong>{secondary ? <span className={ui.secondaryText}>{secondary}</span> : null}</span></div>;
    }
    if (column.kind === "stack") return <><strong className={ui.primaryText}>{value}</strong>{secondary ? <span className={ui.secondaryText}>{secondary}</span> : null}</>;
    if (column.kind === "status") {
      const tone = column.toneKey ? row[column.toneKey] : "neutral";
      const className = tone === "success" ? ui.statusBadge : tone === "danger" ? ui.statusDanger : tone === "warning" ? ui.statusWarning : ui.statusNeutral;
      return <span className={className}><span className={ui.statusDot} />{value}</span>;
    }
    if (column.kind === "mono") return <span className={ui.monoText}>{value}</span>;
    if (column.kind === "link" && column.hrefKey && row[column.hrefKey]) return <Link className={ui.rowAction} href={String(row[column.hrefKey])}>{value}</Link>;
    return <>{value}{secondary ? <span className={ui.secondaryText}>{secondary}</span> : null}</>;
  }

  return (
    <>
      <div className={ui.tableToolbar}>
        <p className={ui.tableHint}><GripVertical size={14} /> Sütun başlıklarını sürükleyerek sıralayabilirsiniz.</p>
        {canExport ? <button type="button" className={ui.secondaryAction} onClick={exportRows}><Download size={15} />Excel&apos;e Aktar</button> : null}
      </div>
      <div className={ui.tableViewport}>
        <table className={`${ui.dataTable} ${ui.reorderableTable}`} style={{ minWidth }}>
          <thead><tr>{orderedColumns.map((column) => <th
            key={column.id}
            draggable
            className={draggedId === column.id ? ui.draggedColumn : ui.draggableColumn}
            onDragStart={() => setDraggedId(column.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => moveColumn(column.id)}
            onDragEnd={() => setDraggedId(null)}
            title="Sütunu taşımak için sürükleyin"
          ><span><GripVertical size={13} />{column.label}</span></th>)}</tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={orderedColumns.length} className={ui.emptyCell}>{emptyMessage}</td></tr> : rows.map((row, index) => <tr key={String(row.id ?? index)}>{orderedColumns.map((column) => <td key={column.id}>{renderCell(row, column)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
