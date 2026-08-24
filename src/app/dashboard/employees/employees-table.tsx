"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Eye, GripVertical } from "lucide-react";
import { ExportButton } from "@/app/dashboard/export-button";
import styles from "../page.module.css";

type EmployeeRow = {
  id: string;
  fullName: string;
  age: number;
  department: string;
  rfidCardId: string;
  email: string;
  status: string;
};

type ColumnKey = "fullName" | "department" | "rfidCardId" | "email" | "status";

const storageKey = "rfid-personel-employees-column-order";
const defaultOrder: ColumnKey[] = ["fullName", "department", "rfidCardId", "email", "status"];

const columnMap: Record<
  ColumnKey,
  {
    label: string;
    render: (employee: EmployeeRow) => ReactNode;
    exportValue: (employee: EmployeeRow) => string | number;
  }
> = {
  fullName: {
    label: "Personel",
    render: (employee) => (
      <>
        <strong>{employee.fullName}</strong>
        <p className={styles.tableSubText}>{employee.age} yas</p>
      </>
    ),
    exportValue: (employee) => employee.fullName,
  },
  department: {
    label: "Departman",
    render: (employee) => employee.department,
    exportValue: (employee) => employee.department,
  },
  rfidCardId: {
    label: "RFID Kart ID",
    render: (employee) => <span className={styles.monoCell}>{employee.rfidCardId}</span>,
    exportValue: (employee) => employee.rfidCardId,
  },
  email: {
    label: "E-posta",
    render: (employee) => employee.email,
    exportValue: (employee) => employee.email,
  },
  status: {
    label: "Statu",
    render: (employee) => (
      <span className={employee.status === "Aktif" ? styles.statusActive : styles.statusPassive}>
        {employee.status}
      </span>
    ),
    exportValue: (employee) => employee.status,
  },
};

function getSavedOrder() {
  if (typeof window === "undefined") return defaultOrder;

  const savedValue = window.localStorage.getItem(storageKey);
  if (!savedValue) return defaultOrder;

  try {
    const savedOrder = JSON.parse(savedValue) as ColumnKey[];
    const cleanOrder = savedOrder.filter((key): key is ColumnKey => defaultOrder.includes(key));
    const missingColumns = defaultOrder.filter((key) => !cleanOrder.includes(key));
    return [...cleanOrder, ...missingColumns];
  } catch {
    return defaultOrder;
  }
}

export function EmployeesTable({ employees }: { employees: EmployeeRow[] }) {
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultOrder);
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);

  useEffect(() => {
    setColumnOrder(getSavedOrder());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const exportColumns = useMemo(
    () =>
      columnOrder.map((key) => ({
        key,
        label: columnMap[key].label,
      })),
    [columnOrder],
  );
  const exportRows = useMemo(
    () =>
      employees.map((employee) => ({
        fullName: columnMap.fullName.exportValue(employee),
        department: columnMap.department.exportValue(employee),
        rfidCardId: columnMap.rfidCardId.exportValue(employee),
        email: columnMap.email.exportValue(employee),
        status: columnMap.status.exportValue(employee),
      })),
    [employees],
  );

  const moveColumn = (targetColumn: ColumnKey) => {
    if (!draggedColumn || draggedColumn === targetColumn) return;

    setColumnOrder((currentOrder) => {
      const nextOrder = currentOrder.filter((key) => key !== draggedColumn);
      const targetIndex = nextOrder.indexOf(targetColumn);
      nextOrder.splice(targetIndex, 0, draggedColumn);
      return nextOrder;
    });
    setDraggedColumn(null);
  };

  return (
    <>
      <div className={styles.tableActionRow}>
        <p className={styles.emptyState}>
          Sütun başlıklarını sürükleyerek sırayı değiştirebilirsin. Sıralama bu tarayıcıda hatırlanır.
        </p>
        <ExportButton
          rows={exportRows}
          columns={exportColumns}
          filename="personeller"
          className={styles.inlineAction}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columnOrder.map((columnKey) => (
                <th
                  key={columnKey}
                  draggable
                  onDragStart={() => setDraggedColumn(columnKey)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => moveColumn(columnKey)}
                  className={styles.draggableTh}
                >
                  <span>
                    <GripVertical size={14} />
                    {columnMap[columnKey].label}
                  </span>
                </th>
              ))}
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.length + 1} className={styles.emptyCell}>
                  Aramana uygun personel bulunamadi.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id}>
                  {columnOrder.map((columnKey) => (
                    <td key={`${employee.id}-${columnKey}`}>{columnMap[columnKey].render(employee)}</td>
                  ))}
                  <td>
                    <Link href={`/dashboard/employees/${employee.id}`} className={styles.inlineAction}>
                      <Eye size={16} />
                      <span>Incele</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
