"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FileUp } from "lucide-react";
import { decodeCsv } from "@/lib/personnel-import";
import { parseSalarySheetCsv, personnelCsvTemplate } from "@/lib/salary-sheet-csv";
import { importAccountingPersonnelAction } from "@/modules/accounting/actions";
import { LicenseLockedAction } from "../../../license-locked-action";
import ui from "../../../management.module.css";
import styles from "../../accounting.module.css";

/** CSV buttons of the personnel list; parsing happens in the browser, saving on the server. */
export function AccountingPersonnelImport({ locked = false }: { locked?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(["﻿", personnelCsvTemplate()], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Muhasebe-Personel-Sablon.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const { rows, skipped } = parseSalarySheetCsv(decodeCsv(new Uint8Array(await file.arrayBuffer())));
    if (!rows.length) {
      setMessage({ ok: false, text: "Dosyada adı ve maaşı olan personel satırı bulunamadı. Şablonu indirip kullanabilirsiniz." });
      return;
    }
    startTransition(async () => {
      const result = await importAccountingPersonnelAction(rows, "GROSS");
      setMessage({ ok: result.ok, text: result.ok ? `${rows.length} personel eklendi.${skipped.length ? ` Maaşı okunamayan satırlar atlandı: ${skipped.join(", ")}.` : ""} Eksik departman, pozisyon ve yaka tipleri Sabit Tanımlar'a eklendi.` : result.message });
      if (result.ok) router.refresh();
    });
  };

  return (
    <>
      <button type="button" className={ui.secondaryAction} onClick={downloadTemplate}><FileDown size={16} />CSV şablonu</button>
      {locked
        ? <LicenseLockedAction moduleName="Muhasebe"><FileUp size={16} />CSV&apos;den yükle</LicenseLockedAction>
        : <button type="button" className={ui.secondaryAction} onClick={() => input.current?.click()} disabled={pending}><FileUp size={16} />{pending ? "Yükleniyor..." : "CSV'den yükle"}</button>}
      <input ref={input} type="file" accept=".csv,.txt,text/csv" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      {message ? <p className={message.ok ? styles.feedback : styles.feedbackError} role={message.ok ? "status" : "alert"}>{message.text}</p> : null}
    </>
  );
}
