"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import {
  cloneSalaryParameters,
  DEFAULT_2026_SALARY_PARAMETERS,
  parseSalaryParameters,
  SALARY_EMPLOYEE_TYPE_LABELS,
  SALARY_MONTHS,
  SALARY_PARAMETERS_STORAGE_KEY,
  type SalaryEmployeeType,
  type SalaryParameters,
} from "@/lib/salary-calculation";
import ui from "../../management.module.css";
import styles from "../accounting.module.css";

const employeeTypes = Object.keys(SALARY_EMPLOYEE_TYPE_LABELS) as SalaryEmployeeType[];

export function SalarySettingsForm({ canManage }: { canManage: boolean }) {
  const [parameters, setParameters] = useState<SalaryParameters>(() => cloneSalaryParameters());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParameters(parseSalaryParameters(window.localStorage.getItem(SALARY_PARAMETERS_STORAGE_KEY)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateNumber = (key: keyof SalaryParameters, value: number) => setParameters((current) => ({ ...current, [key]: value }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const ordered = [...parameters.taxBrackets].sort((left, right) => left.lower - right.lower);
    const valid = ordered.every((bracket, index) => bracket.upper > bracket.lower && (index === 0 || bracket.lower === ordered[index - 1].upper));
    if (!valid || parameters.socialSecurityCeiling < parameters.socialSecurityFloor) {
      setMessage("Vergi dilimi sınırlarını ve SGK taban/tavan değerlerini kontrol edin.");
      return;
    }
    window.localStorage.setItem(SALARY_PARAMETERS_STORAGE_KEY, JSON.stringify(parameters));
    setMessage("Sabit tanımlar bu tarayıcı için kaydedildi.");
  };

  const reset = () => {
    if (!canManage) return;
    const defaults = cloneSalaryParameters(DEFAULT_2026_SALARY_PARAMETERS);
    setParameters(defaults);
    window.localStorage.setItem(SALARY_PARAMETERS_STORAGE_KEY, JSON.stringify(defaults));
    setMessage("Exceldeki 2026 varsayılanları geri yüklendi.");
  };

  return (
    <form className={ui.formShell} onSubmit={save}>
      <aside className={styles.compatibilityNote}>
        <strong>Test ortamı bilgisi</strong>
        <span>Tanımlar Excel dosyasındaki 2026 değerleriyle açılır ve bu aşamada yalnız kullandığınız tarayıcıda saklanır.</span>
      </aside>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}><h2>Dönem ve SGK sınırları</h2><p>Hesaplamada kullanılacak geçerlilik dönemi ile prime esas kazanç aralığı.</p></div>
        <div className={ui.formGridThree}>
          <label className={ui.formField}><span>Yıl</span><input disabled={!canManage} type="number" value={parameters.year} onChange={(event) => updateNumber("year", Number(event.target.value))} /></label>
          <label className={ui.formField}><span>Başlangıç tarihi</span><input disabled={!canManage} type="date" value={parameters.validFrom} onChange={(event) => setParameters((current) => ({ ...current, validFrom: event.target.value }))} /></label>
          <label className={ui.formField}><span>Bitiş tarihi</span><input disabled={!canManage} type="date" value={parameters.validTo} onChange={(event) => setParameters((current) => ({ ...current, validTo: event.target.value }))} /></label>
          <label className={ui.formField}><span>SGK taban (₺)</span><input disabled={!canManage} type="number" min="0" step="0.01" value={parameters.socialSecurityFloor} onChange={(event) => updateNumber("socialSecurityFloor", Number(event.target.value))} /></label>
          <label className={ui.formField}><span>SGK tavan (₺)</span><input disabled={!canManage} type="number" min="0" step="0.01" value={parameters.socialSecurityCeiling} onChange={(event) => updateNumber("socialSecurityCeiling", Number(event.target.value))} /></label>
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}><h2>Çalışan ve işveren oranları</h2><p>Oran alanları yüzde olarak gösterilir; hesap motorunda ondalık katsayıya çevrilir.</p></div>
        <div className={ui.formGridThree}>
          <label className={ui.formField}><span>İşçi SGK payı (%)</span><input disabled={!canManage} type="number" min="0" step="0.001" value={parameters.employeeSocialSecurityRate * 100} onChange={(event) => updateNumber("employeeSocialSecurityRate", Number(event.target.value) / 100)} /></label>
          <label className={ui.formField}><span>İşçi işsizlik payı (%)</span><input disabled={!canManage} type="number" min="0" step="0.001" value={parameters.employeeUnemploymentRate * 100} onChange={(event) => updateNumber("employeeUnemploymentRate", Number(event.target.value) / 100)} /></label>
          <label className={ui.formField}><span>Damga vergisi (%)</span><input disabled={!canManage} type="number" min="0" step="0.001" value={parameters.stampTaxRate * 100} onChange={(event) => updateNumber("stampTaxRate", Number(event.target.value) / 100)} /></label>
          {employeeTypes.map((type) => (
            <label key={`sgk-${type}`} className={ui.formField}><span>{SALARY_EMPLOYEE_TYPE_LABELS[type]} işveren SGK (%)</span><input disabled={!canManage} type="number" min="0" step="0.001" value={parameters.employerSocialSecurityRates[type] * 100} onChange={(event) => setParameters((current) => ({ ...current, employerSocialSecurityRates: { ...current.employerSocialSecurityRates, [type]: Number(event.target.value) / 100 } }))} /></label>
          ))}
          {employeeTypes.map((type) => (
            <label key={`unemployment-${type}`} className={ui.formField}><span>{SALARY_EMPLOYEE_TYPE_LABELS[type]} işveren işsizlik (%)</span><input disabled={!canManage} type="number" min="0" step="0.001" value={parameters.employerUnemploymentRates[type] * 100} onChange={(event) => setParameters((current) => ({ ...current, employerUnemploymentRates: { ...current.employerUnemploymentRates, [type]: Number(event.target.value) / 100 } }))} /></label>
          ))}
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}><h2>Gelir vergisi dilimleri</h2><p>Alt ve üst sınırlar birbirini kesintisiz izlemelidir.</p></div>
        <div className={ui.tableViewport}>
          <table className={`${ui.dataTable} ${styles.settingsTable}`}>
            <thead><tr><th>Dilim</th><th>Alt sınır (₺)</th><th>Üst sınır (₺)</th><th>Oran (%)</th></tr></thead>
            <tbody>{parameters.taxBrackets.map((bracket, index) => <tr key={index}>
              <td>{index + 1}. dilim</td>
              <td><input aria-label={`${index + 1}. dilim alt sınır`} disabled={!canManage} type="number" min="0" step="0.01" value={bracket.lower} onChange={(event) => setParameters((current) => ({ ...current, taxBrackets: current.taxBrackets.map((item, itemIndex) => itemIndex === index ? { ...item, lower: Number(event.target.value) } : item) }))} /></td>
              <td><input aria-label={`${index + 1}. dilim üst sınır`} disabled={!canManage} type="number" min="0" step="0.01" value={bracket.upper} onChange={(event) => setParameters((current) => ({ ...current, taxBrackets: current.taxBrackets.map((item, itemIndex) => itemIndex === index ? { ...item, upper: Number(event.target.value) } : item) }))} /></td>
              <td><input aria-label={`${index + 1}. dilim oran`} disabled={!canManage} type="number" min="0" step="0.01" value={bracket.rate * 100} onChange={(event) => setParameters((current) => ({ ...current, taxBrackets: current.taxBrackets.map((item, itemIndex) => itemIndex === index ? { ...item, rate: Number(event.target.value) / 100 } : item) }))} /></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}><h2>Aylık vergi istisnaları</h2><p>Gelir ve damga vergisi istisnaları her ay için ayrı uygulanır.</p></div>
        <div className={styles.exemptionGrid}>
          {parameters.monthlyExemptions.map((exemption, index) => <fieldset key={exemption.month} className={styles.monthCard}>
            <legend>{SALARY_MONTHS[index]}</legend>
            <label className={ui.formField}><span>Gelir vergisi (₺)</span><input disabled={!canManage} type="number" min="0" step="0.01" value={exemption.incomeTax} onChange={(event) => setParameters((current) => ({ ...current, monthlyExemptions: current.monthlyExemptions.map((item, itemIndex) => itemIndex === index ? { ...item, incomeTax: Number(event.target.value) } : item) }))} /></label>
            <label className={ui.formField}><span>Damga vergisi (₺)</span><input disabled={!canManage} type="number" min="0" step="0.01" value={exemption.stampTax} onChange={(event) => setParameters((current) => ({ ...current, monthlyExemptions: current.monthlyExemptions.map((item, itemIndex) => itemIndex === index ? { ...item, stampTax: Number(event.target.value) } : item) }))} /></label>
          </fieldset>)}
        </div>
      </section>

      {!canManage ? <p className={styles.permissionNote}>Sabit tanımları değiştirme yetkiniz bulunmuyor; değerleri salt okunur inceleyebilirsiniz.</p> : null}
      {message ? <p className={styles.feedback}>{message}</p> : null}
      <div className={ui.formActions}>
        <button type="button" className={ui.secondaryAction} onClick={reset} disabled={!canManage}><RotateCcw size={16} /> Excel varsayılanlarını yükle</button>
        <button type="submit" className={ui.primaryAction} disabled={!canManage}><Save size={16} /> Tanımları kaydet</button>
      </div>
    </form>
  );
}

