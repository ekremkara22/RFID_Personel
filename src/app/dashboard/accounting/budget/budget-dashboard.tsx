"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Banknote, Building2, CalendarRange, FileDown, TrendingUp, UserRound, Users, Wallet } from "lucide-react";
import { buildBudgetReport, type BudgetEmployee, type BudgetGroup } from "@/lib/budget-report";
import { WORKFORCE_TYPE_LABELS, type WorkforceTypeCode } from "@/lib/personnel-profile";
import { DEFAULT_2026_SALARY_PARAMETERS, parseSalaryParameters, SALARY_PARAMETERS_STORAGE_KEY, type SalaryParameters } from "@/lib/salary-calculation";
import ui from "../../management.module.css";
import styles from "./budget.module.css";

const whole = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 });
const PALETTE = ["#1570ef", "#0e9384", "#f79009", "#7a5af8", "#ee46bc", "#16b364", "#667085", "#dd2590"];

function tl(value: number) {
  return `${whole.format(Math.round(value))} ₺`;
}

/** Short form for chart labels: 1,2 Mn ₺ / 850 B ₺ */
function shortTl(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn ₺`;
  if (value >= 1_000) return `${whole.format(value / 1_000)} B ₺`;
  return tl(value);
}

function GroupBars({ groups, limit }: { groups: BudgetGroup[]; limit?: number }) {
  const visible = limit ? groups.slice(0, limit) : groups;
  const max = Math.max(1, ...visible.map((group) => group.annualEmployerCost));
  if (!visible.length) return <p className={styles.emptyChart}>Maaşı tanımlı personel yok.</p>;
  return (
    <ul className={styles.barList}>
      {visible.map((group, index) => (
        <li key={group.key}>
          <div className={styles.barLabel}><span>{group.label}</span><strong>{shortTl(group.annualEmployerCost)}</strong></div>
          <div className={styles.barTrack} aria-hidden="true"><span style={{ width: `${(group.annualEmployerCost / max) * 100}%`, background: PALETTE[index % PALETTE.length] }} /></div>
          <small>{group.headcount} personel · {percent.format(group.share)}</small>
        </li>
      ))}
    </ul>
  );
}

export function BudgetDashboard({ companyName, employees, canExport, canEditEmployees }: {
  companyName: string;
  employees: BudgetEmployee[];
  canExport: boolean;
  canEditEmployees: boolean;
}) {
  const [parameters, setParameters] = useState<SalaryParameters>(DEFAULT_2026_SALARY_PARAMETERS);
  const [raise, setRaise] = useState(0);
  const [category, setCategory] = useState("");
  const [workforce, setWorkforce] = useState("");
  const [department, setDepartment] = useState("");
  const [reportDate, setReportDate] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setParameters(parseSalaryParameters(window.localStorage.getItem(SALARY_PARAMETERS_STORAGE_KEY)));
      } catch {
        // Depolama kapalıysa varsayılan parametreler kullanılır.
      }
      setReportDate(new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date()));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const categories = useMemo(() => [...new Set(employees.map((item) => item.category ?? "Tanımsız"))].sort((a, b) => a.localeCompare(b, "tr")), [employees]);
  const departments = useMemo(() => [...new Set(employees.map((item) => item.department))].sort((a, b) => a.localeCompare(b, "tr")), [employees]);
  const filtered = useMemo(() => employees.filter((item) =>
    (!category || (item.category ?? "Tanımsız") === category)
    && (!workforce || (item.workforceType ?? "NONE") === workforce)
    && (!department || item.department === department)), [employees, category, workforce, department]);

  const raiseRate = Number.isFinite(raise) ? Math.min(Math.max(raise, 0), 300) / 100 : 0;
  const base = useMemo(() => buildBudgetReport(filtered, parameters), [filtered, parameters]);
  const report = useMemo(() => raiseRate ? buildBudgetReport(filtered, parameters, raiseRate) : base, [filtered, parameters, raiseRate, base]);
  const costDelta = report.annualEmployerCost - base.annualEmployerCost;
  const monthMax = Math.max(1, ...report.months.map((month) => month.employerCost));
  const workforceTotal = report.byWorkforce.reduce((total, item) => total + item.annualEmployerCost, 0);
  const missing = filtered.filter((item) => !item.grossSalary);
  const filterSummary = [category && `Kategori: ${category}`, workforce && `Tip: ${workforce === "NONE" ? "Tanımsız" : WORKFORCE_TYPE_LABELS[workforce as WorkforceTypeCode]}`, department && `Departman: ${department}`].filter(Boolean).join(" · ") || "Tüm personel";

  const kpis = [
    { label: "Aktif personel", value: whole.format(report.headcount), hint: `${report.salariedHeadcount} kişinin maaşı tanımlı`, icon: Users },
    { label: "Aylık brüt maaş", value: tl(report.monthlyGross), hint: "Bordro brüt toplamı", icon: Banknote },
    { label: "Aylık işveren maliyeti", value: tl(report.annualEmployerCost / 12), hint: `Brüte ek yük ${percent.format(report.employerBurdenRate)}`, icon: Building2 },
    { label: "Yıllık işveren maliyeti", value: tl(report.annualEmployerCost), hint: raiseRate ? `Mevcuda göre +${tl(costDelta)}` : `${parameters.year} parametreleriyle`, icon: TrendingUp, highlight: true },
    { label: "Yıllık net ödeme", value: tl(report.annualNet), hint: "Çalışanlara ödenecek", icon: Wallet },
    { label: "Kişi başı aylık maliyet", value: tl(report.averageMonthlyEmployerCost), hint: "İşveren maliyeti ortalaması", icon: UserRound },
  ];

  return (
    <div className={`${ui.managementPage} ${styles.report}`}>
      <header className={`${ui.pageHeader} ${styles.screenOnly}`}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe · Bütçe</p>
          <h1 className={ui.pageTitle}>Personel Bütçe Raporu</h1>
          <p className={ui.pageDescription}>Maaş tanımlarından yıllık işveren maliyetini, departman ve kategori dağılımını ve zam senaryolarını değerlendirin.</p>
        </div>
        {canExport ? (
          <div className={ui.headerActions}>
            <button type="button" className={ui.primaryAction} onClick={() => window.print()}><FileDown size={16} />PDF olarak indir</button>
          </div>
        ) : null}
      </header>

      <div className={styles.printHeader}>
        <div>
          <p>{companyName}</p>
          <h1>Personel Bütçe Raporu</h1>
          <span>{filterSummary}{raiseRate ? ` · %${raise} zam senaryosu` : ""}</span>
        </div>
        <dl>
          <div><dt>Rapor tarihi</dt><dd>{reportDate}</dd></div>
          <div><dt>Parametre yılı</dt><dd>{parameters.year}</dd></div>
        </dl>
      </div>

      <section className={`${ui.surface} ${styles.screenOnly}`} aria-label="Bütçe filtreleri">
        <div className={styles.filters}>
          <label className={ui.field}><span className={ui.fieldLabel}>Zam senaryosu (%)</span><input className={ui.control} type="number" min="0" max="300" step="0.5" inputMode="decimal" value={raise} onChange={(event) => setRaise(event.target.valueAsNumber || 0)} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman kategorisi</span><select className={ui.control} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tüm kategoriler</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman</span><select className={ui.control} value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Personel tipi</span><select className={ui.control} value={workforce} onChange={(event) => setWorkforce(event.target.value)}><option value="">Mavi ve beyaz yaka</option><option value="BLUE_COLLAR">Mavi yaka</option><option value="WHITE_COLLAR">Beyaz yaka</option><option value="NONE">Tanımsız</option></select></label>
          <div className={styles.contextTag}><CalendarRange size={15} /><span>{parameters.year} vergi ve SGK parametreleri</span></div>
        </div>
      </section>

      {missing.length ? (
        <div className={`${styles.warning} ${styles.screenOnly}`} role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span><strong>{missing.length} personelin maaşı tanımlı değil</strong> ve bütçeye dahil edilmedi: {missing.slice(0, 5).map((item) => item.name).join(", ")}{missing.length > 5 ? ` ve ${missing.length - 5} kişi daha` : ""}.</span>
          {canEditEmployees ? <Link href="/dashboard/employees" className={ui.secondaryAction}>Personel kayıtları</Link> : null}
        </div>
      ) : null}

      <section className={styles.kpiGrid} aria-label="Bütçe özeti">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className={`${styles.kpiCard} ${kpi.highlight ? styles.kpiHighlight : ""}`}>
              <span className={styles.kpiIcon}><Icon size={18} /></span>
              <p>{kpi.label}</p>
              <strong>{kpi.value}</strong>
              <small>{kpi.hint}</small>
            </article>
          );
        })}
      </section>

      {raiseRate ? (
        <section className={`${ui.surface} ${styles.scenario}`}>
          <div><span>Mevcut yıllık maliyet</span><strong>{tl(base.annualEmployerCost)}</strong></div>
          <div><span>%{raise} zam sonrası</span><strong>{tl(report.annualEmployerCost)}</strong></div>
          <div><span>Ek bütçe ihtiyacı</span><strong className={styles.delta}>+{tl(costDelta)}</strong><small>Aylık +{tl(costDelta / 12)}</small></div>
        </section>
      ) : null}

      <div className={styles.chartRow}>
        <section className={`${ui.surface} ${styles.chartCard}`}>
          <div className={ui.sectionHeading}><div><h2>Aylık işveren maliyeti</h2><p>Brüt maaş + işveren SGK ve işsizlik payı</p></div></div>
          <div className={styles.monthChart} role="img" aria-label={`Aylık işveren maliyeti; yıllık toplam ${tl(report.annualEmployerCost)}`}>
            {report.months.map((month) => (
              <div key={month.month} className={styles.monthColumn}>
                <span className={styles.monthValue}>{shortTl(month.employerCost)}</span>
                <div className={styles.monthTrack}><span style={{ height: `${(month.employerCost / monthMax) * 100}%` }} /></div>
                <span className={styles.monthLabel}>{month.label.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${ui.surface} ${styles.chartCard}`}>
          <div className={ui.sectionHeading}><div><h2>Personel tipi dağılımı</h2><p>Yıllık işveren maliyetine göre</p></div></div>
          {workforceTotal > 0 ? (
            <>
              <div className={styles.stackedBar} aria-hidden="true">
                {report.byWorkforce.map((item, index) => <span key={item.key} style={{ width: `${item.share * 100}%`, background: PALETTE[index % PALETTE.length] }} />)}
              </div>
              <ul className={styles.legend}>
                {report.byWorkforce.map((item, index) => (
                  <li key={item.key}>
                    <i style={{ background: PALETTE[index % PALETTE.length] }} />
                    <span>{item.label}</span>
                    <strong>{percent.format(item.share)}</strong>
                    <small>{item.headcount} kişi · {shortTl(item.annualEmployerCost)}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className={styles.emptyChart}>Maaşı tanımlı personel yok.</p>}
          <div className={styles.subHeading}><h3>Departman kategorileri</h3></div>
          <GroupBars groups={report.byCategory} />
        </section>
      </div>

      <section className={`${ui.surface} ${styles.breakSection}`}>
        <div className={ui.sectionHeading}><div><h2>Departman bazında bütçe</h2><p>Yıllık işveren maliyetine göre büyükten küçüğe</p></div><span className={ui.countBadge}>{report.byDepartment.length} departman</span></div>
        <div className={ui.tableViewport}>
          <table className={`${ui.dataTable} ${styles.budgetTable}`}>
            <thead><tr><th>Departman</th><th>Personel</th><th>Aylık brüt</th><th>Yıllık brüt</th><th>Yıllık net</th><th>Yıllık işveren maliyeti</th><th>Pay</th></tr></thead>
            <tbody>
              {report.byDepartment.length === 0 ? <tr><td colSpan={7} className={ui.emptyCell}>Maaşı tanımlı personel bulunmuyor.</td></tr> : report.byDepartment.map((item) => (
                <tr key={item.key}>
                  <td><span className={ui.primaryText}>{item.label}</span></td>
                  <td>{item.headcount}</td>
                  <td className={styles.amount}>{tl(item.monthlyGross)}</td>
                  <td className={styles.amount}>{tl(item.annualGross)}</td>
                  <td className={styles.amount}>{tl(item.annualNet)}</td>
                  <td className={`${styles.amount} ${styles.strong}`}>{tl(item.annualEmployerCost)}</td>
                  <td><div className={styles.shareCell}><span className={styles.shareTrack}><span style={{ width: `${item.share * 100}%` }} /></span>{percent.format(item.share)}</div></td>
                </tr>
              ))}
            </tbody>
            {report.byDepartment.length ? (
              <tfoot><tr><td>Toplam</td><td>{report.salariedHeadcount}</td><td className={styles.amount}>{tl(report.monthlyGross)}</td><td className={styles.amount}>{tl(report.annualGross)}</td><td className={styles.amount}>{tl(report.annualNet)}</td><td className={styles.amount}>{tl(report.annualEmployerCost)}</td><td>%100</td></tr></tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <section className={`${ui.surface} ${styles.breakSection}`}>
        <div className={ui.sectionHeading}><div><h2>Pozisyon bazında maliyet</h2><p>En yüksek maliyetli 10 pozisyon</p></div></div>
        <GroupBars groups={report.byPosition} limit={10} />
      </section>

      <p className={styles.footnote}>Hesaplamalar {parameters.year} gelir vergisi dilimleri, SGK taban/tavanı ve asgari ücret istisnaları ile yapılmıştır. Maaşı tanımlı olmayan personeller bütçeye dahil edilmez. Rapor tarihi: {reportDate}.</p>
    </div>
  );
}
