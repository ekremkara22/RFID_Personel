"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  calculateGrossToNet,
  calculateNetToGross,
  DEFAULT_2026_SALARY_PARAMETERS,
  parseSalaryParameters,
  SALARY_EMPLOYEE_TYPE_LABELS,
  SALARY_MONTHS,
  SALARY_PARAMETERS_STORAGE_KEY,
  type SalaryCalculationResult,
  type SalaryEmployeeType,
  type SalaryParameters,
} from "@/lib/salary-calculation";
import ui from "../../management.module.css";
import styles from "../accounting.module.css";

type CalculatorMode = "gross-to-net" | "net-to-gross";
type InputRow = { id: number; name: string; employeeType: SalaryEmployeeType; amount: number };
type ResultRow = InputRow & { calculation: SalaryCalculationResult };

type ColumnKey = "employee" | "employeeType" | "employerCost" | "monthlyInput" | `month-${number}` | "annualTotal";
type Column = { key: ColumnKey; label: string };

const currency = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INITIAL_ROWS: InputRow[] = [{ id: 1, name: "Personel 1", employeeType: "incentive", amount: 123_456 }];

function columnsFor(mode: CalculatorMode): Column[] {
  return [
    { key: "employee", label: "Ad Soyad" },
    { key: "employeeType", label: "Çalışan Tipi" },
    { key: "employerCost", label: "İşveren Maliyeti" },
    { key: "monthlyInput", label: mode === "gross-to-net" ? "Brüt Maaş" : "Net Maaş" },
    ...SALARY_MONTHS.map((label, index) => ({ key: `month-${index + 1}` as const, label })),
    { key: "annualTotal", label: mode === "gross-to-net" ? "Toplam Net" : "Toplam Brüt" },
  ];
}

function calculateRow(row: InputRow, mode: CalculatorMode, parameters: SalaryParameters): ResultRow {
  const calculation = mode === "gross-to-net"
    ? calculateGrossToNet(row.amount, row.employeeType, parameters)
    : calculateNetToGross(row.amount, row.employeeType, parameters);
  return { ...row, calculation };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function SalaryCalculator({ mode, canCalculate, canExport }: { mode: CalculatorMode; canCalculate: boolean; canExport: boolean }) {
  const defaultColumns = useMemo(() => columnsFor(mode), [mode]);
  const [parameters, setParameters] = useState<SalaryParameters>(DEFAULT_2026_SALARY_PARAMETERS);
  const [rows, setRows] = useState<InputRow[]>(INITIAL_ROWS);
  const [results, setResults] = useState<ResultRow[]>(() => [calculateRow(INITIAL_ROWS[0], mode, DEFAULT_2026_SALARY_PARAMETERS)]);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultColumns.map((column) => column.key));
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedParameters = parseSalaryParameters(window.localStorage.getItem(SALARY_PARAMETERS_STORAGE_KEY));
      const storedOrder = window.localStorage.getItem(`rfid-personel.salary-columns.${mode}`);
      setParameters(storedParameters);
      setResults(INITIAL_ROWS.map((row) => calculateRow(row, mode, storedParameters)));
      if (storedOrder) {
        try {
          const parsed = JSON.parse(storedOrder) as ColumnKey[];
          if (parsed.length === defaultColumns.length && defaultColumns.every((column) => parsed.includes(column.key))) setColumnOrder(parsed);
        } catch {
          // Bozuk tarayıcı tercihi varsayılan sırayı değiştirmez.
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaultColumns, mode]);

  const orderedColumns = columnOrder.map((key) => defaultColumns.find((column) => column.key === key)!).filter(Boolean);
  const inputLabel = mode === "gross-to-net" ? "Aylık brüt maaş" : "Hedef aylık net maaş";
  const outputLabel = mode === "gross-to-net" ? "aylık net tutarlar" : "aylık brüt tutarlar";

  const updateRow = <Key extends keyof InputRow>(id: number, key: Key, value: InputRow[Key]) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
    setMessage(null);
  };

  const runCalculation = () => {
    try {
      setResults(rows.map((row) => calculateRow(row, mode, parameters)));
      setMessage(`${rows.length} personel için hesaplama tamamlandı.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hesaplama tamamlanamadı.");
    }
  };

  const addRow = () => {
    const id = Math.max(0, ...rows.map((row) => row.id)) + 1;
    setRows((current) => [...current, { id, name: `Personel ${id}`, employeeType: "incentive", amount: 123_456 }]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows((current) => current.filter((row) => row.id !== id));
    setResults((current) => current.filter((row) => row.id !== id));
  };

  const moveColumn = (target: ColumnKey) => {
    if (!draggedColumn || draggedColumn === target) return;
    const next = [...columnOrder];
    const from = next.indexOf(draggedColumn);
    const to = next.indexOf(target);
    next.splice(from, 1);
    next.splice(to, 0, draggedColumn);
    setColumnOrder(next);
    window.localStorage.setItem(`rfid-personel.salary-columns.${mode}`, JSON.stringify(next));
  };

  const cellValue = (row: ResultRow, key: ColumnKey, formatted = true): string | number => {
    if (key === "employee") return row.name;
    if (key === "employeeType") return SALARY_EMPLOYEE_TYPE_LABELS[row.employeeType];
    if (key === "employerCost") return formatted ? `${currency.format(row.calculation.annualEmployerCost)} ₺` : row.calculation.annualEmployerCost;
    if (key === "monthlyInput") return formatted ? `${currency.format(row.amount)} ₺` : row.amount;
    if (key === "annualTotal") {
      const value = mode === "gross-to-net" ? row.calculation.annualNet : row.calculation.annualGross;
      return formatted ? `${currency.format(value)} ₺` : value;
    }
    const month = row.calculation.months[Number(key.split("-")[1]) - 1];
    const value = mode === "gross-to-net" ? month.net : month.gross;
    return formatted ? `${currency.format(value)} ₺` : value;
  };

  const exportCsv = () => {
    const lines = [
      orderedColumns.map((column) => csvCell(column.label)).join(";"),
      ...results.map((row) => orderedColumns.map((column) => csvCell(cellValue(row, column.key, false))).join(";")),
    ];
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mode === "gross-to-net" ? "brutten-nete" : "netten-brute"}-${parameters.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div>
            <h2>{mode === "gross-to-net" ? "Brütten Nete" : "Netten Brüte"}</h2>
            <p>{parameters.year} parametreleriyle 12 aylık {outputLabel} ve işveren maliyetini hesaplar.</p>
          </div>
          <span className={ui.countBadge}>{rows.length} personel</span>
        </div>

        <div className={styles.inputTableViewport}>
          <table className={styles.inputTable}>
            <thead><tr><th>Ad Soyad</th><th>Çalışan Tipi</th><th>{inputLabel}</th><th aria-label="Satır işlemi" /></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><input aria-label={`${row.name} ad soyad`} value={row.name} onChange={(event) => updateRow(row.id, "name", event.target.value)} /></td>
                  <td>
                    <select aria-label={`${row.name} çalışan tipi`} value={row.employeeType} onChange={(event) => updateRow(row.id, "employeeType", event.target.value as SalaryEmployeeType)}>
                      {Object.entries(SALARY_EMPLOYEE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td><input aria-label={`${row.name} ${inputLabel}`} type="number" min="0.01" step="0.01" value={row.amount} onChange={(event) => updateRow(row.id, "amount", Number(event.target.value))} /></td>
                  <td><button type="button" className={`${ui.rowAction} ${ui.compactAction}`} onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label={`${row.name} satırını kaldır`}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.calculatorActions}>
          <button type="button" className={ui.secondaryAction} onClick={addRow}><Plus size={16} /> Satır ekle</button>
          <button type="button" className={ui.primaryAction} onClick={runCalculation} disabled={!canCalculate}><Calculator size={16} /> Hesapla</button>
        </div>
        {!canCalculate ? <p className={styles.permissionNote}>Hesaplama için yetkiniz bulunmuyor.</p> : null}
        {message ? <p className={styles.feedback}>{message}</p> : null}
      </section>

      <section className={ui.surface}>
        <div className={ui.tableToolbar}>
          <p className={ui.tableHint}><GripVertical size={14} /> Sütunları sürükleyerek sıralayabilirsiniz. Dışa aktarma bu sırayı kullanır.</p>
          {canExport ? <button type="button" className={ui.secondaryAction} onClick={exportCsv}><Download size={16} /> CSV dışa aktar</button> : null}
        </div>
        <div className={ui.tableViewport}>
          <table className={`${ui.dataTable} ${ui.reorderableTable} ${styles.resultTable}`}>
            <thead>
              <tr>
                {orderedColumns.map((column) => (
                  <th
                    key={column.key}
                    draggable
                    className={`${ui.draggableColumn} ${draggedColumn === column.key ? ui.draggedColumn : ""}`}
                    onDragStart={() => setDraggedColumn(column.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveColumn(column.key)}
                    onDragEnd={() => setDraggedColumn(null)}
                  ><span><GripVertical size={13} />{column.label}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row) => <tr key={row.id}>{orderedColumns.map((column) => <td key={column.key}>{cellValue(row, column.key)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <aside className={styles.compatibilityNote}>
        <strong>Excel uyumluluk modu</strong>
        <span>Bu test sürümü, verilen dosyadaki 2026 oranlarını ve emekli çalışan dahil aynı hesaplama davranışını korur. Parametre değişiklikleri şimdilik yalnız bu tarayıcıda saklanır.</span>
      </aside>
    </>
  );
}

