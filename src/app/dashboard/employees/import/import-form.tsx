"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileUp, Users } from "lucide-react";
import { importEmployeesAction, type PersonnelImportResult } from "@/modules/personnel/import-actions";
import ui from "../../management.module.css";
import styles from "./import.module.css";

export function EmployeeImportForm() {
  const [result, setResult] = useState<PersonnelImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <form
        ref={formRef}
        className={styles.uploadForm}
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setResult(null);
          startTransition(async () => {
            const response = await importEmployeesAction(data);
            setResult(response);
            if (response.ok) {
              formRef.current?.reset();
              setFileName("");
            }
            requestAnimationFrame(() => feedbackRef.current?.focus());
          });
        }}
      >
        <label className={styles.dropZone}>
          <FileUp size={26} aria-hidden="true" />
          <strong>{fileName || "Dosya seçin"}</strong>
          <span>.xlsx, .xls veya .csv · en fazla 2 MB ve 1.000 personel</span>
          <input name="file" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
        </label>
        <label className={ui.checkField}><input name="createMissing" type="checkbox" defaultChecked />Dosyada olup sistemde olmayan departmanları otomatik oluştur</label>
        <div className={ui.formActions}>
          <button type="submit" className={ui.primaryAction} disabled={pending}><FileUp size={16} />{pending ? "Kontrol ediliyor ve aktarılıyor..." : "Kontrol et ve içe aktar"}</button>
        </div>
      </form>

      {result ? (
        <div ref={feedbackRef} tabIndex={-1} className={result.ok ? styles.resultSuccess : styles.resultError} role={result.ok ? "status" : "alert"}>
          <div className={styles.resultHead}>
            {result.ok ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
            <strong>{result.message}</strong>
          </div>
          {result.notes.length ? <ul className={styles.noteList}>{result.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
          {result.ok ? <Link href="/dashboard/employees" className={ui.secondaryAction}><Users size={16} />Personel listesine git</Link> : null}
          {result.issues.length ? (
            <div className={ui.tableViewport}>
              <table className={ui.dataTable}>
                <thead><tr><th>Satır</th><th>Sorun</th></tr></thead>
                <tbody>{result.issues.map((issue) => <tr key={`${issue.line}-${issue.message}`}><td className={styles.lineCell}>{issue.line}</td><td>{issue.message}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
