"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Calculator, Download, GripVertical, Plus, Trash2, UserPlus, Users, Wallet, Building2 } from "lucide-react";
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
export type CalculatorEmployee = { id: number; name: string; grossSalary: number; employeeType: SalaryEmployeeType };

type ColumnKey = "employee" | "employeeType" | "employerCost" | "monthlyInput" | `month-${number}` | "annualTotal";
type Column = { key: ColumnKey; label: string };

const currency = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const INITIAL_ROWS: InputRow[] = [{ id: 1, name: "Personel 1", employeeType: "incentive", amount: 123_456 }];

function money(value: number) {
  return `${currency.format(value)} ₺`;
}

function columnsFor(mode: CalculatorMode): Column[] {
  return [
    { key: "employee", label: "Ad Soyad" },
    { key: "employeeType", label: "Çalışan Tipi" },
    { key: "monthlyInput", label: mode === "gross-to-net" ? "Brüt Maaş" : "Net Maaş" },
    ...SALARY_MONTHS.map((label, index) => ({ key: `month-${index + 1}` as const, label })),
    { key: "annualTotal", label: mode === "gross-to-net" ? "Toplam Net" : "Toplam Brüt" },
    { key: "employerCost", label: "Yıllık İşveren Maliyeti" },
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

export function SalaryCalculator({ mode, canCalculate, canExport, employees = [] }: { mode: CalculatorMode; canCalculate: boolean; canExport: boolean; employees?: CalculatorEmployee[] }) {
  const defaultColumns = useMemo(() => columnsFor(mode), [mode]);
  const [parameters, setParameters] = useState<SalaryParameters>(DEFAULT_2026_SALARY_PARAMETERS);
  const [rows, setRows] = useState<InputRow[]>(INITIAL_ROWS);
  const [results, setResults] = useState<ResultRow[]>(() => [calculateRow(INITIAL_ROWS[0], mode, DEFAULT_2026_SALARY_PARAMETERS)]);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultColumns.map((column) => column.key));
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [detailId, setDetailId] = useState<number>(INITIAL_ROWS[0].id);
  const storageKey = `rfid-personel.salary-columns.v2.${mode}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let storedParameters = DEFAULT_2026_SALARY_PARAMETERS;
      let storedOrder: string | null = null;
      try {
        storedParameters = parseSalaryParameters(window.localStorage.getItem(SALARY_PARAMETERS_STORAGE_KEY));
        storedOrder = window.localStorage.getItem(storageKey);
      } catch {
        // Tarayıcı depolaması kapalıysa varsayılan parametrelerle devam edilir.
      }
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
  }, [defaultColumns, mode, storageKey]);

  const orderedColumns = columnOrder.map((key) => defaultColumns.find((column) => column.key === key)!).filter(Boolean);
  const inputLabel = mode === "gross-to-net" ? "Aylık brüt maaş (₺)" : "Hedef aylık net maaş (₺)";
  const outputLabel = mode === "gross-to-net" ? "aylık net tutarlar" : "aylık brüt tutarlar";
  const totals = useMemo(() => ({
    monthlyInput: results.reduce((total, row) => total + row.amount, 0),
    annualGross: results.reduce((total, row) => total + row.calculation.annualGross, 0),
    annualNet: results.reduce((total, row) => total + row.calculation.annualNet, 0),
    employerCost: results.reduce((total, row) => total + row.calculation.annualEmployerCost, 0),
    months: SALARY_MONTHS.map((_, index) => results.reduce((total, row) => total + (mode === "gross-to-net" ? row.calculation.months[index].net : row.calculation.months[index].gross), 0)),
  }), [results, mode]);
  const detailRow = results.find((row) => row.id === detailId) ?? results[0];

  const updateRow = <Key extends keyof InputRow>(id: number, key: Key, value: InputRow[Key]) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
    setMessage(null);
  };

  const runCalculation = (source = rows) => {
    const invalid = source.find((row) => !Number.isFinite(row.amount) || row.amount <= 0);
    if (invalid) {
      setMessage({ tone: "error", text: `"${invalid.name}" için sıfırdan büyük bir tutar girin.` });
      return;
    }
    try {
      const calculated = source.map((row) => calculateRow(row, mode, parameters));
      setResults(calculated);
      if (!calculated.some((row) => row.id === detailId)) setDetailId(calculated[0]?.id ?? 0);
      setMessage({ tone: "success", text: `${source.length} personel için hesaplama tamamlandı.` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Hesaplama tamamlanamadı." });
    }
  };

  const addRow = () => {
    const id = Math.max(0, ...rows.map((row) => row.id)) + 1;
    setRows((current) => [...current, { id, name: `Personel ${id}`, employeeType: "incentive", amount: mode === "gross-to-net" ? 33_030 : 28_075.5 }]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows((current) => current.filter((row) => row.id !== id));
    setResults((current) => current.filter((row) => row.id !== id));
  };

  const loadEmployees = () => {
    const loaded = employees.map((employee, index) => ({ id: index + 1, name: employee.name, employeeType: employee.employeeType, amount: employee.grossSalary }));
    setRows(loaded);
    runCalculation(loaded);
  };

  const moveColumn = (target: ColumnKey) => {
    if (!draggedColumn || draggedColumn === target) return;
    const next = [...columnOrder];
    const from = next.indexOf(draggedColumn);
    const to = next.indexOf(target);
    next.splice(from, 1);
    next.splice(to, 0, draggedColumn);
    setColumnOrder(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Sıralama yalnız bu oturumda geçerli kalır.
    }
  };

  const cellValue = (row: ResultRow, key: ColumnKey, formatted = true): string | number => {
    if (key === "employee") return row.name;
    if (key === "employeeType") return SALARY_EMPLOYEE_TYPE_LABELS[row.employeeType];
    if (key === "employerCost") return formatted ? money(row.calculation.annualEmployerCost) : row.calculation.annualEmployerCost;
    if (key === "monthlyInput") return formatted ? money(row.amount) : row.amount;
    if (key === "annualTotal") {
      const value = mode === "gross-to-net" ? row.calculation.annualNet : row.calculation.annualGross;
      return formatted ? money(value) : value;
    }
    const month = row.calculation.months[Number(key.split("-")[1]) - 1];
    const value = mode === "gross-to-net" ? month.net : month.gross;
    return formatted ? money(value) : value;
  };

  const totalValue = (key: ColumnKey) => {
    if (key === "employee") return "Toplam";
    if (key === "employeeType") return `${results.length} personel`;
    if (key === "employerCost") return money(totals.employerCost);
    if (key === "monthlyInput") return money(totals.monthlyInput);
    if (key === "annualTotal") return money(mode === "gross-to-net" ? totals.annualNet : totals.annualGross);
    return money(totals.months[Number(key.split("-")[1]) - 1]);
  };

  const exportCsv = () => {
    const lines = [
      orderedColumns.map((column) => csvCell(column.label)).join(";"),
      ...results.map((row) => orderedColumns.map((column) => csvCell(cellValue(row, column.key, false))).join(";")),
    ];
    const blob = new Blob(["﻿", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mode === "gross-to-net" ? "brutten-nete" : "netten-brute"}-${parameters.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: "Hesaplanan personel", value: String(results.length), hint: `${parameters.year} parametreleri`, icon: Users },
    { label: "Aylık brüt toplam", value: `${compact.format(results.reduce((total, row) => total + row.calculation.months[0].gross, 0))} ₺`, hint: "Ocak ayı brüt toplamı", icon: Banknote },
    { label: "Yıllık net toplam", value: `${compact.format(totals.annualNet)} ₺`, hint: "Çalışana ödenecek", icon: Wallet },
    { label: "Yıllık işveren maliyeti", value: `${compact.format(totals.employerCost)} ₺`, hint: `Aylık ort. ${compact.format(totals.employerCost / 12)} ₺`, icon: Building2 },
  ];

  return (
    <>
      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div>
            <h2>{mode === "gross-to-net" ? "Brütten Nete" : "Netten Brüte"} hesaplama</h2>
            <p>{parameters.year} parametreleriyle 12 aylık {outputLabel}, kesintiler ve işveren maliyeti hesaplanır.</p>
          </div>
          <div className={ui.toolbarActions}>
            {mode === "gross-to-net" && employees.length > 0 ? (
              <button type="button" className={ui.secondaryAction} onClick={loadEmployees} disabled={!canCalculate} title="Maaşı tanımlı aktif personelleri listeye aktarır">
                <UserPlus size={16} /> Personellerden aktar ({employees.length})
              </button>
            ) : null}
            <button type="button" className={ui.secondaryAction} onClick={addRow}><Plus size={16} /> Satır ekle</button>
          </div>
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
                  <td><input aria-label={`${row.name} ${inputLabel}`} type="number" min="0.01" step="0.01" inputMode="decimal" value={Number.isFinite(row.amount) ? row.amount : ""} onChange={(event) => updateRow(row.id, "amount", event.target.valueAsNumber)} /></td>
                  <td><button type="button" className={`${ui.rowAction} ${ui.compactAction}`} onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label={`${row.name} satırını kaldır`}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.calculatorActions}>
          {message ? <p className={message.tone === "success" ? styles.feedback : styles.feedbackError} role={message.tone === "success" ? "status" : "alert"}>{message.text}</p> : <span />}
          <button type="button" className={ui.primaryAction} onClick={() => runCalculation()} disabled={!canCalculate}><Calculator size={16} /> Hesapla</button>
        </div>
        {!canCalculate ? <p className={styles.permissionNote}>Hesaplama için yetkiniz bulunmuyor.</p> : null}
      </section>

      <section className={styles.summaryGrid} aria-label="Hesaplama özeti">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={styles.summaryCard}>
              <span className={styles.summaryIcon}><Icon size={18} /></span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Sonuç tablosu</h2><p>{mode === "gross-to-net" ? "Aylar net ödemeyi" : "Aylar brüt tutarı"} gösterir; son satır toplamlardır.</p></div>
          {canExport ? <button type="button" className={ui.secondaryAction} onClick={exportCsv}><Download size={16} /> CSV dışa aktar</button> : null}
        </div>
        <p className={ui.tableHint}><GripVertical size={14} /> Sütunları sürükleyerek sıralayabilirsiniz. Dışa aktarma bu sırayı kullanır.</p>
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
              {results.map((row) => <tr key={row.id}>{orderedColumns.map((column) => <td key={column.key} className={column.key === "employee" || column.key === "employeeType" ? undefined : styles.amountCell}>{cellValue(row, column.key)}</td>)}</tr>)}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>{orderedColumns.map((column) => <td key={column.key} className={column.key === "employee" || column.key === "employeeType" ? undefined : styles.amountCell}>{totalValue(column.key)}</td>)}</tr>
            </tfoot>
          </table>
        </div>
      </section>

      {detailRow ? (
        <section className={ui.surface}>
          <div className={ui.sectionHeading}>
            <div><h2>Aylık kesinti dökümü</h2><p>Seçilen personelin SGK, işsizlik, gelir ve damga vergisi kesintileri.</p></div>
            <label className={styles.detailPicker}>
              <span>Personel</span>
              <select value={detailRow.id} onChange={(event) => setDetailId(Number(event.target.value))}>
                {results.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
          </div>
          <div className={ui.tableViewport}>
            <table className={`${ui.dataTable} ${styles.breakdownTable}`}>
              <thead><tr><th>Ay</th><th>Brüt</th><th>SGK işçi</th><th>İşsizlik işçi</th><th>GV matrahı</th><th>Kümülatif matrah</th><th>Gelir vergisi</th><th>Damga vergisi</th><th>Net</th></tr></thead>
              <tbody>
                {detailRow.calculation.months.map((month) => (
                  <tr key={month.month}>
                    <td>{month.monthLabel}</td>
                    <td className={styles.amountCell}>{money(month.gross)}</td>
                    <td className={styles.amountCell}>{money(month.employeeSocialSecurity)}</td>
                    <td className={styles.amountCell}>{money(month.employeeUnemployment)}</td>
                    <td className={styles.amountCell}>{money(month.incomeTaxBase)}</td>
                    <td className={styles.amountCell}>{money(month.cumulativeIncomeTaxBase)}</td>
                    <td className={styles.amountCell}>{money(month.incomeTax)}</td>
                    <td className={styles.amountCell}>{money(month.stampTax)}</td>
                    <td className={`${styles.amountCell} ${styles.netCell}`}>{money(month.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <aside className={styles.compatibilityNote}>
        <strong>Parametreler</strong>
        <span>Hesaplamalar Sabit Tanımlar sekmesindeki {parameters.year} oranlarını kullanır. Parametre değişiklikleri şimdilik yalnız bu tarayıcıda saklanır.</span>
      </aside>
    </>
  );
}
