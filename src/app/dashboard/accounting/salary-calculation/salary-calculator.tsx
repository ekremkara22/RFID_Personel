"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Building2, CheckCircle2, CircleAlert, Download, FileDown, FileUp, GripVertical, LoaderCircle, Plus, Trash2, UserPlus, Users, Wallet, X } from "lucide-react";
import { SALARY_INSURANCE_TYPE_LABELS, SALARY_INSURANCE_TYPES, salaryEngineType, type SalaryInsuranceTypeCode } from "@/lib/personnel-profile";
import { decodeCsv } from "@/lib/personnel-import";
import { parseSalarySheetCsv, salarySheetCsvTemplate } from "@/lib/salary-sheet-csv";
import { calculateGrossToNet, calculateNetToGross, SALARY_MONTHS, type SalaryCalculationResult, type SalaryParameters } from "@/lib/salary-calculation";
import { saveSalaryWorksheetAction } from "@/modules/accounting/actions";
import type { WorksheetModeKey, WorksheetRowData } from "@/modules/accounting/repository";
import ui from "../../management.module.css";
import styles from "../accounting.module.css";

type SheetRow = WorksheetRowData & { uid: number };
type ColumnKey = "name" | "department" | "position" | "collarType" | "insuranceType" | "employerCost" | "amount" | `month-${number}` | "annualTotal";
type Column = { key: ColumnKey; label: string; numeric?: boolean };
type SaveState = { status: "idle" | "dirty" | "saving" | "saved" | "error"; text?: string };

const currency = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const money = (value: number) => currency.format(value);

function columnsFor(mode: WorksheetModeKey): Column[] {
  return [
    { key: "name", label: "Ad Soyad" },
    { key: "department", label: "Departman" },
    { key: "position", label: "Pozisyon" },
    { key: "collarType", label: "Yaka" },
    { key: "insuranceType", label: "Çalışan Tipi" },
    { key: "employerCost", label: "İşveren Maliyeti (Yıllık)", numeric: true },
    { key: "amount", label: mode === "gross-to-net" ? "Brüt Maaş" : "Net Maaş", numeric: true },
    ...SALARY_MONTHS.map((label, index) => ({ key: `month-${index + 1}` as const, label, numeric: true })),
    { key: "annualTotal", label: mode === "gross-to-net" ? "Toplam Net" : "Toplam Brüt", numeric: true },
  ];
}

function calculate(row: WorksheetRowData, mode: WorksheetModeKey, parameters: SalaryParameters): SalaryCalculationResult | null {
  if (!Number.isFinite(row.amount) || row.amount <= 0) return null;
  const type = salaryEngineType(row.insuranceType);
  return mode === "gross-to-net" ? calculateGrossToNet(row.amount, type, parameters) : calculateNetToGross(row.amount, type, parameters);
}

function csvCell(value: string | number) {
  const text = typeof value === "number" ? String(value).replace(".", ",") : value;
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Select that keeps a value which is not (or no longer) in the definitions, like a CSV-imported name. */
function DefinitionSelect({ value, options, label, disabled, onChange }: { value: string; options: string[]; label: string; disabled: boolean; onChange: (value: string) => void }) {
  const list = value && !options.includes(value) ? [...options, value] : options;
  return (
    <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {list.map((item) => <option key={item} value={item}>{item}{options.includes(item) ? "" : " (tanımsız)"}</option>)}
    </select>
  );
}

export function SalaryCalculator({ mode, canCalculate, canExport, initialRows, parameters, definitions, employees = [] }: {
  mode: WorksheetModeKey;
  canCalculate: boolean;
  canExport: boolean;
  initialRows: WorksheetRowData[];
  parameters: SalaryParameters;
  definitions: { departments: string[]; positions: string[]; collarTypes: string[] };
  employees?: WorksheetRowData[];
}) {
  const defaultColumns = useMemo(() => columnsFor(mode), [mode]);
  const nextUid = useRef(initialRows.length + 1);
  const [rows, setRows] = useState<SheetRow[]>(() => initialRows.map((row, index) => ({ ...row, uid: index + 1 })));
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultColumns.map((column) => column.key));
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [detail, setDetail] = useState<string>("all");
  const fileInput = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
  const storageKey = `rfid-personel.salary-sheet-columns.v4.${mode}`;
  const amountLabel = mode === "gross-to-net" ? "Brüt Maaş" : "Net Maaş";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) return;
        const parsed = JSON.parse(stored) as ColumnKey[];
        if (parsed.length === defaultColumns.length && defaultColumns.every((column) => parsed.includes(column.key))) setColumnOrder(parsed);
      } catch {
        // Bozuk veya erişilemeyen tarayıcı tercihi varsayılan sırayı değiştirmez.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaultColumns, storageKey]);

  // Auto-save shortly after the last edit so the budget report always reads the current sheet.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!canCalculate) return;
    const timer = window.setTimeout(async () => {
      setSaveState({ status: "saving" });
      const payload = rows.map((row) => ({ name: row.name, department: row.department, position: row.position, collarType: row.collarType, insuranceType: row.insuranceType, amount: row.amount, personnelId: row.personnelId }));
      try {
        const result = await saveSalaryWorksheetAction(mode, payload);
        setSaveState(result.ok
          ? { status: "saved", text: new Intl.DateTimeFormat("tr-TR", { timeStyle: "short" }).format(new Date()) }
          : { status: "error", text: result.message });
      } catch {
        setSaveState({ status: "error", text: "Sunucuya ulaşılamadı; değişiklikler kaydedilmedi." });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [rows, mode, canCalculate]);

  const results = useMemo(() => rows.map((row) => ({ row, result: calculate(row, mode, parameters) })), [rows, mode, parameters]);
  const calculated = results.filter((item): item is { row: SheetRow; result: SalaryCalculationResult } => item.result !== null);
  const orderedColumns = columnOrder.map((key) => defaultColumns.find((column) => column.key === key)!).filter(Boolean);
  const totals = useMemo(() => ({
    amount: calculated.reduce((total, item) => total + item.row.amount, 0),
    employerCost: calculated.reduce((total, item) => total + item.result.annualEmployerCost, 0),
    annualGross: calculated.reduce((total, item) => total + item.result.annualGross, 0),
    annualNet: calculated.reduce((total, item) => total + item.result.annualNet, 0),
    months: SALARY_MONTHS.map((_, index) => calculated.reduce((total, item) => total + (mode === "gross-to-net" ? item.result.months[index].net : item.result.months[index].gross), 0)),
  }), [calculated, mode]);

  const change = (uid: number, patch: Partial<WorksheetRowData>) => {
    setRows((current) => current.map((row) => row.uid === uid ? { ...row, ...patch } : row));
    setSaveState({ status: "dirty" });
  };
  const append = (items: WorksheetRowData[]) => {
    setRows((current) => [...current, ...items.map((item) => ({ ...item, uid: nextUid.current++ }))]);
    setSaveState({ status: "dirty" });
  };
  const addRow = () => append([{ name: `Personel ${rows.length + 1}`, department: "", position: "", collarType: "", insuranceType: "INCENTIVE", amount: 0, personnelId: null }]);
  const removeRow = (uid: number) => {
    setRows((current) => current.filter((row) => row.uid !== uid));
    setSaveState({ status: "dirty" });
  };
  const clearAll = () => {
    if (!rows.length || !window.confirm("Bu listedeki tüm satırlar silinsin mi? Bütçe raporu da bu listeden beslenir.")) return;
    setRows([]);
    setSaveState({ status: "dirty" });
  };
  const loadEmployees = () => {
    const existing = new Set(rows.map((row) => row.personnelId).filter(Boolean));
    const fresh = employees.filter((employee) => !existing.has(employee.personnelId));
    if (!fresh.length) {
      setNotice({ tone: "success", text: "Maaşı tanımlı tüm personeller zaten listede." });
      return;
    }
    append(fresh);
    setNotice({ tone: "success", text: `${fresh.length} personel kartından aktarıldı.` });
  };
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { rows: parsed, skipped } = parseSalarySheetCsv(decodeCsv(new Uint8Array(await file.arrayBuffer())));
      if (!parsed.length) {
        setNotice({ tone: "error", text: "Dosyada tutarı olan personel satırı bulunamadı. Şablonu indirip kullanabilirsiniz." });
        return;
      }
      append(parsed.map((row) => ({ ...row, personnelId: null })));
      setNotice({ tone: skipped.length ? "error" : "success", text: `${parsed.length} personel eklendi.${skipped.length ? ` Tutarı okunamayan satırlar atlandı: ${skipped.join(", ")}.` : ""}` });
    } catch {
      setNotice({ tone: "error", text: "Dosya okunamadı. CSV biçiminde kaydedildiğinden emin olun." });
    }
  };

  const moveColumn = (target: ColumnKey) => {
    if (!draggedColumn || draggedColumn === target) return;
    const next = [...columnOrder];
    next.splice(next.indexOf(draggedColumn), 1);
    next.splice(next.indexOf(target), 0, draggedColumn);
    setColumnOrder(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Sıralama yalnız bu oturumda geçerli kalır.
    }
  };

  const plainValue = (row: SheetRow, result: SalaryCalculationResult | null, key: ColumnKey): string | number => {
    if (key === "name") return row.name;
    if (key === "department") return row.department;
    if (key === "position") return row.position;
    if (key === "collarType") return row.collarType;
    if (key === "insuranceType") return SALARY_INSURANCE_TYPE_LABELS[row.insuranceType];
    if (key === "amount") return row.amount;
    if (!result) return "";
    if (key === "employerCost") return result.annualEmployerCost;
    if (key === "annualTotal") return mode === "gross-to-net" ? result.annualNet : result.annualGross;
    const month = result.months[Number(key.split("-")[1]) - 1];
    return mode === "gross-to-net" ? month.net : month.gross;
  };

  const exportCsv = () => {
    const lines = [orderedColumns.map((column) => csvCell(column.label)).join(";"), ...results.filter((item) => item.result).map(({ row, result }) => orderedColumns.map((column) => csvCell(plainValue(row, result, column.key))).join(";"))];
    download(`${mode === "gross-to-net" ? "Brut-Net" : "Net-Brut"}-${parameters.year}.csv`, lines.join("\r\n"));
  };

  const editable = canCalculate;
  const renderCell = (row: SheetRow, result: SalaryCalculationResult | null, column: Column) => {
    switch (column.key) {
      case "name": return <input className={styles.nameInput} aria-label="Ad soyad" value={row.name} disabled={!editable} onChange={(event) => change(row.uid, { name: event.target.value })} placeholder="Ad Soyad" />;
      case "department": return <DefinitionSelect label={`${row.name} departman`} value={row.department} options={definitions.departments} disabled={!editable} onChange={(value) => change(row.uid, { department: value })} />;
      case "position": return <DefinitionSelect label={`${row.name} pozisyon`} value={row.position} options={definitions.positions} disabled={!editable} onChange={(value) => change(row.uid, { position: value })} />;
      case "collarType": return <DefinitionSelect label={`${row.name} yaka`} value={row.collarType} options={definitions.collarTypes} disabled={!editable} onChange={(value) => change(row.uid, { collarType: value })} />;
      case "insuranceType": return <select aria-label={`${row.name} çalışan tipi`} value={row.insuranceType} disabled={!editable} onChange={(event) => change(row.uid, { insuranceType: event.target.value as SalaryInsuranceTypeCode })}>{SALARY_INSURANCE_TYPES.map((type) => <option key={type} value={type}>{SALARY_INSURANCE_TYPE_LABELS[type]}</option>)}</select>;
      case "amount": return <input className={styles.amountInput} aria-label={`${row.name} ${amountLabel}`} type="number" min="0" step="0.01" inputMode="decimal" value={row.amount || ""} disabled={!editable} onChange={(event) => change(row.uid, { amount: event.target.valueAsNumber || 0 })} />;
      default: {
        const value = plainValue(row, result, column.key);
        return typeof value === "number" ? money(value) : value;
      }
    }
  };

  const totalCell = (key: ColumnKey) => {
    if (key === "name") return "TOPLAM";
    if (key === "employerCost") return money(totals.employerCost);
    if (key === "amount") return money(totals.amount);
    if (key === "annualTotal") return money(mode === "gross-to-net" ? totals.annualNet : totals.annualGross);
    if (key.startsWith("month-")) return money(totals.months[Number(key.split("-")[1]) - 1]);
    return "";
  };

  const detailItems = detail === "all" ? calculated : calculated.filter((item) => String(item.row.uid) === detail);
  const breakdown = SALARY_MONTHS.map((label, index) => detailItems.reduce((sum, { row, result }) => {
    const month = result.months[index];
    const type = salaryEngineType(row.insuranceType);
    return {
      label,
      gross: sum.gross + month.gross,
      employeeSocialSecurity: sum.employeeSocialSecurity + month.employeeSocialSecurity,
      employeeUnemployment: sum.employeeUnemployment + month.employeeUnemployment,
      incomeTaxBase: sum.incomeTaxBase + month.incomeTaxBase,
      incomeTax: sum.incomeTax + month.incomeTax,
      stampTax: sum.stampTax + month.stampTax,
      net: sum.net + month.net,
      employerCost: sum.employerCost + month.rawGross
        + Math.round(month.socialSecurityBase * parameters.employerSocialSecurityRates[type] * 100) / 100
        + Math.round(month.socialSecurityBase * parameters.employerUnemploymentRates[type] * 100) / 100,
    };
  }, { label, gross: 0, employeeSocialSecurity: 0, employeeUnemployment: 0, incomeTaxBase: 0, incomeTax: 0, stampTax: 0, net: 0, employerCost: 0 }));
  const breakdownTotal = breakdown.reduce((sum, month) => ({
    gross: sum.gross + month.gross, employeeSocialSecurity: sum.employeeSocialSecurity + month.employeeSocialSecurity, employeeUnemployment: sum.employeeUnemployment + month.employeeUnemployment,
    incomeTaxBase: sum.incomeTaxBase + month.incomeTaxBase, incomeTax: sum.incomeTax + month.incomeTax, stampTax: sum.stampTax + month.stampTax, net: sum.net + month.net, employerCost: sum.employerCost + month.employerCost,
  }), { gross: 0, employeeSocialSecurity: 0, employeeUnemployment: 0, incomeTaxBase: 0, incomeTax: 0, stampTax: 0, net: 0, employerCost: 0 });

  const summary = [
    { label: "Personel", value: whole.format(calculated.length), hint: rows.length > calculated.length ? `${rows.length - calculated.length} satırda tutar yok` : `${parameters.year} parametreleri`, icon: Users },
    { label: "Yıllık toplam brüt", value: `${whole.format(totals.annualGross)} ₺`, hint: "12 ay brüt", icon: Banknote },
    { label: "Yıllık toplam net", value: `${whole.format(totals.annualNet)} ₺`, hint: "Çalışana ödenecek", icon: Wallet },
    { label: "Yıllık işveren maliyeti", value: `${whole.format(totals.employerCost)} ₺`, hint: `Aylık ort. ${whole.format(totals.employerCost / 12)} ₺`, icon: Building2 },
  ];

  return (
    <>
      <section className={ui.surface}>
        <div className={styles.sheetBar}>
          <div className={styles.sheetActions}>
            {editable ? <button type="button" className={ui.secondaryAction} onClick={addRow}><Plus size={16} />Personel ekle</button> : null}
            {editable && mode === "gross-to-net" && employees.length ? <button type="button" className={ui.secondaryAction} onClick={loadEmployees}><UserPlus size={16} />Personel tanımlarından aktar</button> : null}
            {editable ? <button type="button" className={ui.secondaryAction} onClick={() => fileInput.current?.click()}><FileUp size={16} />CSV&apos;den personel yükle</button> : null}
            <input ref={fileInput} type="file" accept=".csv,.txt,text/csv" hidden onChange={(event) => { void importCsv(event.target.files?.[0]); event.target.value = ""; }} />
            <button type="button" className={ui.secondaryAction} onClick={() => download("Personel-Sablon.csv", salarySheetCsvTemplate(amountLabel))}><FileDown size={16} />CSV şablonu indir</button>
            {canExport ? <button type="button" className={ui.secondaryAction} onClick={exportCsv} disabled={!calculated.length}><Download size={16} />Sonuçları CSV indir</button> : null}
            {editable ? <button type="button" className={ui.dangerAction} onClick={clearAll} disabled={!rows.length}><X size={16} />Tümünü temizle</button> : null}
          </div>
          <span className={styles.saveState} data-status={saveState.status} role="status">
            {saveState.status === "saving" ? <><LoaderCircle size={14} className={styles.spin} />Kaydediliyor…</>
              : saveState.status === "saved" ? <><CheckCircle2 size={14} />Kaydedildi · {saveState.text}</>
                : saveState.status === "dirty" ? <>Kaydedilmemiş değişiklik</>
                  : saveState.status === "error" ? <><CircleAlert size={14} />{saveState.text}</>
                    : editable ? <>Değişiklikler otomatik kaydedilir</> : <>Salt okunur</>}
          </span>
        </div>
        <p className={styles.sheetHint}>
          {mode === "gross-to-net" ? "Brüt maaşı girin; her ay için net hesaplanır." : "Net maaşı girin; her ay için gereken brüt hesaplanır."}{" "}
          CSV sütunları: Ad Soyad; Departman; Pozisyon; Yaka; Çalışan Tipi; {amountLabel}. Bütçe raporu bu listeden beslenir.
        </p>
        {notice ? <p className={notice.tone === "success" ? styles.feedback : styles.feedbackError} role={notice.tone === "success" ? "status" : "alert"}>{notice.text}</p> : null}
        {!definitions.departments.length || !definitions.positions.length ? <p className={styles.permissionNote}>Departman veya pozisyon tanımı yok. Muhasebe → Sabit Tanımlar → Departmanlar / Pozisyonlar ekranlarından ekleyebilirsiniz.</p> : null}

        <p className={ui.tableHint}><GripVertical size={14} /> Sütun başlıklarını sürükleyerek sıralayabilirsiniz; CSV dışa aktarma aynı sırayı kullanır.</p>
        <div className={ui.tableViewport}>
          <table className={`${ui.dataTable} ${ui.reorderableTable} ${styles.sheetTable}`}>
            <thead>
              <tr>
                {orderedColumns.map((column) => (
                  <th
                    key={column.key}
                    draggable
                    className={`${ui.draggableColumn} ${draggedColumn === column.key ? ui.draggedColumn : ""} ${column.key === "name" ? styles.stickyCell : ""} ${column.numeric ? styles.amountCell : ""}`}
                    onDragStart={() => setDraggedColumn(column.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveColumn(column.key)}
                    onDragEnd={() => setDraggedColumn(null)}
                  ><span><GripVertical size={13} />{column.label}</span></th>
                ))}
                <th aria-label="Satır işlemi" />
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={orderedColumns.length + 1} className={ui.emptyCell}>Liste boş. &quot;Personel ekle&quot;, &quot;CSV&apos;den personel yükle&quot; veya personel kartlarından aktarma ile başlayın.</td></tr>
              ) : results.map(({ row, result }) => (
                <tr key={row.uid}>
                  {orderedColumns.map((column) => (
                    <td key={column.key} className={`${column.key === "name" ? styles.stickyCell : ""} ${column.numeric ? styles.amountCell : ""} ${column.key === "annualTotal" || column.key === "employerCost" ? styles.keyCell : ""}`}>{renderCell(row, result, column)}</td>
                  ))}
                  <td>{editable ? <button type="button" className={`${ui.rowAction} ${ui.compactAction}`} onClick={() => removeRow(row.uid)} aria-label={`${row.name} satırını sil`}><Trash2 size={15} /></button> : null}</td>
                </tr>
              ))}
            </tbody>
            {calculated.length ? (
              <tfoot>
                <tr className={styles.totalRow}>
                  {orderedColumns.map((column) => <td key={column.key} className={`${column.key === "name" ? styles.stickyCell : ""} ${column.numeric ? styles.amountCell : ""}`}>{totalCell(column.key)}</td>)}
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        <p className={styles.sheetHint}>
          {mode === "gross-to-net"
            ? "Net = Brüt − SGK işçi − İşsizlik işçi − Gelir vergisi (kümülatif, asgari ücret istisnası düşülmüş) − Damga vergisi (istisna düşülmüş)."
            : "Her ay için brüt, ikili arama ile bulunur; kümülatif gelir vergisi matrahı önceki aylara göre ilerler."}{" "}
          İşveren maliyeti = 12 ay brüt + işveren SGK + işveren işsizlik primi.
        </p>
      </section>

      <section className={styles.summaryGrid} aria-label="Hesaplama özeti">
        {summary.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={styles.summaryCard}>
              <span className={styles.summaryIcon}><Icon size={18} /></span>
              <div><p>{card.label}</p><strong>{card.value}</strong><small>{card.hint}</small></div>
            </article>
          );
        })}
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Aylık kesinti dökümü</h2><p>SGK, işsizlik, gelir ve damga vergisi kesintileri ile işveren maliyeti; tüm personel veya tek kişi için.</p></div>
          <label className={styles.detailPicker}>
            <span>Personel</span>
            <select value={detail} onChange={(event) => setDetail(event.target.value)}>
              <option value="all">Tüm personel ({calculated.length})</option>
              {calculated.map(({ row }) => <option key={row.uid} value={String(row.uid)}>{row.name}</option>)}
            </select>
          </label>
        </div>
        <div className={ui.tableViewport}>
          <table className={`${ui.dataTable} ${styles.breakdownTable}`}>
            <thead><tr><th>Ay</th><th className={styles.amountCell}>Brüt</th><th className={styles.amountCell}>SGK işçi</th><th className={styles.amountCell}>İşsizlik işçi</th><th className={styles.amountCell}>GV matrahı</th><th className={styles.amountCell}>Gelir vergisi</th><th className={styles.amountCell}>Damga vergisi</th><th className={styles.amountCell}>Net</th><th className={styles.amountCell}>İşveren maliyeti</th></tr></thead>
            <tbody>
              {detailItems.length === 0 ? <tr><td colSpan={9} className={ui.emptyCell}>Hesaplanmış personel yok.</td></tr> : breakdown.map((month) => (
                <tr key={month.label}>
                  <td>{month.label}</td>
                  <td className={styles.amountCell}>{money(month.gross)}</td>
                  <td className={styles.amountCell}>{money(month.employeeSocialSecurity)}</td>
                  <td className={styles.amountCell}>{money(month.employeeUnemployment)}</td>
                  <td className={styles.amountCell}>{money(month.incomeTaxBase)}</td>
                  <td className={styles.amountCell}>{money(month.incomeTax)}</td>
                  <td className={styles.amountCell}>{money(month.stampTax)}</td>
                  <td className={`${styles.amountCell} ${styles.netCell}`}>{money(month.net)}</td>
                  <td className={styles.amountCell}>{money(month.employerCost)}</td>
                </tr>
              ))}
            </tbody>
            {detailItems.length ? (
              <tfoot>
                <tr className={styles.totalRow}>
                  <td>TOPLAM</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.gross)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.employeeSocialSecurity)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.employeeUnemployment)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.incomeTaxBase)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.incomeTax)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.stampTax)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.net)}</td>
                  <td className={styles.amountCell}>{money(breakdownTotal.employerCost)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </>
  );
}
