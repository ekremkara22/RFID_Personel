"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";
import { resetSalaryParametersAction, saveSalaryParametersAction } from "@/modules/accounting/actions";
import { SALARY_EMPLOYEE_TYPE_LABELS, SALARY_MONTHS, type SalaryEmployeeType, type SalaryParameters } from "@/lib/salary-calculation";
import ui from "../../management.module.css";
import styles from "../accounting.module.css";

const employeeTypes = Object.keys(SALARY_EMPLOYEE_TYPE_LABELS) as SalaryEmployeeType[];
const amount = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Percent inputs keep at most 6 decimals so 0.759 does not turn into 0.7590000000000001. */
const percent = (value: number) => Number((value * 100).toFixed(6));

export function SalaryParametersForm({ initial, canManage }: { initial: SalaryParameters; canManage: boolean }) {
  const router = useRouter();
  const [parameters, setParameters] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<SalaryParameters>) => { setParameters((current) => ({ ...current, ...patch })); setMessage(null); };
  const numberInput = (value: number, onChange: (value: number) => void, label: string, step = "0.01") => (
    <input aria-label={label} type="number" min="0" step={step} value={Number.isFinite(value) ? value : ""} disabled={!canManage} onChange={(event) => onChange(event.target.valueAsNumber)} />
  );

  const save = () => startTransition(async () => {
    const result = await saveSalaryParametersAction(parameters);
    setMessage({ ok: result.ok, text: result.ok ? "Sabit tanımlar firma için kaydedildi; hesaplama ve bütçe ekranları bu değerleri kullanır." : result.message });
  });
  const reset = () => {
    if (!window.confirm("Tüm bordro sabitleri 2026 varsayılanlarına dönsün mü?")) return;
    startTransition(async () => {
      const result = await resetSalaryParametersAction();
      setMessage({ ok: result.ok, text: result.ok ? "2026 varsayılanları geri yüklendi." : result.message });
      if (result.ok) router.refresh();
    });
  };

  const brackets = parameters.taxBrackets.map((bracket, index) => ({
    ...bracket,
    before: parameters.taxBrackets.slice(0, index).reduce((total, item) => total + (item.upper - item.lower) * item.rate, 0),
  }));
  const updateBracket = (index: number, patch: Partial<{ upper: number; rate: number }>) => set({
    taxBrackets: parameters.taxBrackets.map((item, itemIndex) => {
      if (itemIndex === index) return { ...item, ...patch };
      // The next bracket starts where this one ends, as in the approved Excel/HTML tool.
      if (patch.upper !== undefined && itemIndex === index + 1) return { ...item, lower: patch.upper };
      return item;
    }),
  });

  return (
    <>
      <div className={styles.paramBar}>
        <div className={styles.sheetActions}>
          <button type="button" className={ui.primaryAction} onClick={save} disabled={!canManage || pending}><Save size={16} />{pending ? "Kaydediliyor..." : "Tanımları kaydet"}</button>
          <button type="button" className={ui.secondaryAction} onClick={reset} disabled={!canManage || pending}><RotateCcw size={16} />Varsayılan 2026 değerlerine dön</button>
        </div>
        <span className={styles.sheetHint}>{canManage ? "Kaydedilen değerler firmadaki tüm kullanıcılar için geçerlidir." : "Değiştirme yetkiniz yok; değerleri salt okunur inceleyebilirsiniz."}</span>
      </div>
      {message ? <p className={message.ok ? styles.feedback : styles.feedbackError} role={message.ok ? "status" : "alert"}>{message.text}</p> : null}

      <div className={styles.paramGrid}>
        <section className={styles.paramCard}>
          <h3>Katsayılar</h3>
          <table className={styles.paramTable}><tbody>
            <tr><td>SGK primi işçi payı</td><td>{numberInput(percent(parameters.employeeSocialSecurityRate), (value) => set({ employeeSocialSecurityRate: value / 100 }), "SGK işçi payı yüzde", "0.001")} %</td></tr>
            <tr><td>İşsizlik sigortası işçi payı</td><td>{numberInput(percent(parameters.employeeUnemploymentRate), (value) => set({ employeeUnemploymentRate: value / 100 }), "İşsizlik işçi payı yüzde", "0.001")} %</td></tr>
            <tr><td>Damga vergisi</td><td>{numberInput(percent(parameters.stampTaxRate), (value) => set({ stampTaxRate: value / 100 }), "Damga vergisi yüzde", "0.001")} %</td></tr>
          </tbody></table>
        </section>

        <section className={styles.paramCard}>
          <h3>İşveren primleri</h3>
          <table className={styles.paramTable}>
            <thead><tr><th>Çalışan tipi</th><th>SGK</th><th>İşsizlik</th></tr></thead>
            <tbody>{employeeTypes.map((type) => (
              <tr key={type}>
                <td>{SALARY_EMPLOYEE_TYPE_LABELS[type]}</td>
                <td>{numberInput(percent(parameters.employerSocialSecurityRates[type]), (value) => set({ employerSocialSecurityRates: { ...parameters.employerSocialSecurityRates, [type]: value / 100 } }), `${SALARY_EMPLOYEE_TYPE_LABELS[type]} işveren SGK`, "0.001")} %</td>
                <td>{numberInput(percent(parameters.employerUnemploymentRates[type]), (value) => set({ employerUnemploymentRates: { ...parameters.employerUnemploymentRates, [type]: value / 100 } }), `${SALARY_EMPLOYEE_TYPE_LABELS[type]} işveren işsizlik`, "0.001")} %</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className={styles.paramCard}>
          <h3>SGK taban / tavan ve dönem</h3>
          <table className={styles.paramTable}><tbody>
            <tr><td>Yıl</td><td>{numberInput(parameters.year, (value) => set({ year: value }), "Yıl", "1")}</td></tr>
            <tr><td>SGK taban</td><td>{numberInput(parameters.socialSecurityFloor, (value) => set({ socialSecurityFloor: value }), "SGK taban")}</td></tr>
            <tr><td>SGK tavan</td><td>{numberInput(parameters.socialSecurityCeiling, (value) => set({ socialSecurityCeiling: value }), "SGK tavan")}</td></tr>
            <tr><td>Başlangıç tarihi</td><td><input aria-label="Başlangıç tarihi" type="date" value={parameters.validFrom} disabled={!canManage} onChange={(event) => set({ validFrom: event.target.value })} /></td></tr>
            <tr><td>Bitiş tarihi</td><td><input aria-label="Bitiş tarihi" type="date" value={parameters.validTo} disabled={!canManage} onChange={(event) => set({ validTo: event.target.value })} /></td></tr>
          </tbody></table>
        </section>

        <section className={styles.paramCard}>
          <h3>Gelir vergisi dilimleri</h3>
          <table className={styles.paramTable}>
            <thead><tr><th>Alt sınır</th><th>Üst sınır</th><th>Oran</th><th>Birikmiş vergi</th></tr></thead>
            <tbody>{brackets.map((bracket, index) => (
              <tr key={index}>
                <td className={styles.amountCell}>{amount.format(bracket.lower)}</td>
                <td>{numberInput(bracket.upper, (value) => updateBracket(index, { upper: value }), `${index + 1}. dilim üst sınır`)}</td>
                <td>{numberInput(percent(bracket.rate), (value) => updateBracket(index, { rate: value / 100 }), `${index + 1}. dilim oran`)} %</td>
                <td className={styles.amountCell}>{amount.format(bracket.before)}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className={`${styles.paramCard} ${styles.paramCardWide}`}>
          <h3>Aylık asgari ücret istisnaları</h3>
          <table className={styles.paramTable}>
            <thead><tr><th>Ay</th><th>GV istisnası</th><th>DV istisnası</th></tr></thead>
            <tbody>{parameters.monthlyExemptions.map((exemption, index) => (
              <tr key={exemption.month}>
                <td>{SALARY_MONTHS[index]}</td>
                <td>{numberInput(exemption.incomeTax, (value) => set({ monthlyExemptions: parameters.monthlyExemptions.map((item, itemIndex) => itemIndex === index ? { ...item, incomeTax: value } : item) }), `${SALARY_MONTHS[index]} gelir vergisi istisnası`)}</td>
                <td>{numberInput(exemption.stampTax, (value) => set({ monthlyExemptions: parameters.monthlyExemptions.map((item, itemIndex) => itemIndex === index ? { ...item, stampTax: value } : item) }), `${SALARY_MONTHS[index]} damga vergisi istisnası`)}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </div>
    </>
  );
}
