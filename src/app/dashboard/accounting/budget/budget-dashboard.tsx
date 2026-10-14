"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { buildBudgetReport, UNASSIGNED_LABEL, type BudgetEntry, type BudgetGroup } from "@/lib/budget-report";
import { WORKFORCE_TYPE_LABELS } from "@/lib/personnel-profile";
import { SALARY_MONTHS, type SalaryParameters } from "@/lib/salary-calculation";
import ui from "../../management.module.css";
import styles from "./budget.module.css";

type Source = "net-to-gross" | "gross-to-net" | "all";

const SOURCES: { value: Source; label: string }[] = [
  { value: "net-to-gross", label: "Netten Brüte listesi" },
  { value: "gross-to-net", label: "Brütten Nete listesi" },
  { value: "all", label: "Her ikisi (birleşik)" },
];
const PREFERENCE_KEY = "rfid-personel.budget-report.v1";
const amount = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f2 = (value: number) => amount.format(value);
const pct = (value: number) => `${(value * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} %`;
const short = (value: number) => value >= 1e6 ? `${(value / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Mn` : `${Math.round(value / 1e3).toLocaleString("tr-TR")} bin`;

function GroupTable({ title, groups }: { title: string; groups: BudgetGroup[] }) {
  return (
    <section className={styles.card}>
      <h3>{title}</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Grup</th><th>Kişi</th><th>Brüt</th><th>İşveren maliyeti</th><th>Pay</th></tr></thead>
          <tbody>{groups.map((group) => (
            <tr key={group.key}>
              <td className={styles.textCell}>{group.label}</td>
              <td>{group.headcount}</td>
              <td>{f2(group.annualGross)}</td>
              <td>{f2(group.annualEmployerCost)}</td>
              <td className={styles.textCell}><span className={styles.shareBar} style={{ width: `${Math.max(2, Math.round(group.share * 60))}px` }} /> {pct(group.share)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

export function BudgetDashboard({ companyName, grossEntries, netEntries, parameters, canExport }: {
  companyName: string;
  grossEntries: BudgetEntry[];
  netEntries: BudgetEntry[];
  parameters: SalaryParameters;
  canExport: boolean;
}) {
  const [source, setSource] = useState<Source>(netEntries.length && grossEntries.length ? "all" : grossEntries.length ? "gross-to-net" : "net-to-gross");
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [raise, setRaise] = useState(0);
  const [department, setDepartment] = useState("");
  const [workforce, setWorkforce] = useState("");
  const [reportDate, setReportDate] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReportDate(new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date()));
      try {
        const stored = JSON.parse(window.localStorage.getItem(PREFERENCE_KEY) ?? "null") as { source?: Source; budgetLimit?: number } | null;
        if (stored?.source && SOURCES.some((item) => item.value === stored.source)) setSource(stored.source);
        if (stored?.budgetLimit && stored.budgetLimit > 0) setBudgetLimit(stored.budgetLimit);
      } catch {
        // Tercih okunamazsa varsayılan kaynak ve limitsiz bütçe kullanılır.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const remember = (patch: { source?: Source; budgetLimit?: number }) => {
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ source, budgetLimit, ...patch }));
    } catch {
      // Tercih yalnız bu oturumda geçerli kalır.
    }
  };

  const sourceEntries = useMemo(() => source === "all" ? [...netEntries, ...grossEntries] : source === "gross-to-net" ? grossEntries : netEntries, [source, grossEntries, netEntries]);
  const departments = useMemo(() => [...new Set(sourceEntries.map((entry) => entry.department ?? UNASSIGNED_LABEL))].sort((a, b) => a.localeCompare(b, "tr")), [sourceEntries]);
  const entries = useMemo(() => sourceEntries.filter((entry) =>
    (!department || (entry.department ?? UNASSIGNED_LABEL) === department)
    && (!workforce || (entry.workforceType ?? "NONE") === workforce)), [sourceEntries, department, workforce]);
  const raiseRate = Number.isFinite(raise) ? Math.min(Math.max(raise, 0), 300) / 100 : 0;
  const report = useMemo(() => buildBudgetReport(entries, parameters, raiseRate), [entries, parameters, raiseRate]);
  const baseCost = useMemo(() => raiseRate ? buildBudgetReport(entries, parameters).annualEmployerCost : report.annualEmployerCost, [entries, parameters, raiseRate, report]);

  const sourceLabel = SOURCES.find((item) => item.value === source)!.label;
  const filterText = [department && `Departman: ${department}`, workforce && `Yaka: ${workforce === "NONE" ? UNASSIGNED_LABEL : WORKFORCE_TYPE_LABELS[workforce as keyof typeof WORKFORCE_TYPE_LABELS]}`, raiseRate ? `%${raise} zam senaryosu` : ""].filter(Boolean).join(" · ");
  const months = report.months;
  const monthCosts = months.map((month) => month.employerCost);
  const maxMonth = Math.max(1, ...monthCosts);
  const peak = monthCosts.indexOf(Math.max(...monthCosts));
  const low = monthCosts.indexOf(Math.min(...monthCosts));
  const top = report.people.slice(0, 5);
  const topShare = report.annualEmployerCost ? top.reduce((total, person) => total + person.annualEmployerCost, 0) / report.annualEmployerCost : 0;
  const remaining = budgetLimit - report.annualEmployerCost;

  const kpis: { label: string; value: string; hint?: string; tone?: "good" | "bad" }[] = [
    { label: "Personel sayısı", value: String(report.headcount) },
    { label: "Yıllık toplam brüt", value: f2(report.annualGross) },
    { label: "Yıllık toplam net", value: f2(report.annualNet) },
    { label: "Yıllık işveren maliyeti", value: f2(report.annualEmployerCost), hint: raiseRate ? `Mevcut: ${f2(baseCost)}` : undefined },
    { label: "İşveren yükü", value: pct(report.employerBurdenRate), hint: "brüt maaşın üzerine" },
    { label: "Net / maliyet", value: pct(report.netShare), hint: "çalışana net ulaşan pay" },
    { label: "Kişi başı aylık maliyet", value: f2(report.averageMonthlyEmployerCost) },
  ];
  if (budgetLimit > 0) kpis.push({ label: remaining >= 0 ? "Bütçe kalan" : "Bütçe aşımı", value: f2(Math.abs(remaining)), hint: `Kullanım ${pct(report.annualEmployerCost / budgetLimit)}`, tone: remaining >= 0 ? "good" : "bad" });

  return (
    <div className={`${ui.managementPage} ${styles.report}`}>
      <header className={`${ui.pageHeader} ${styles.screenOnly}`}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe · Bütçe</p>
          <h1 className={ui.pageTitle}>Bütçe Raporu</h1>
          <p className={ui.pageDescription}>Maaş hesaplama listelerinden yıllık işveren maliyetini, dağılımları ve bütçe kullanımını değerlendirin; yöneticilere PDF olarak sunun.</p>
        </div>
        {canExport ? <div className={ui.headerActions}><button type="button" className={ui.primaryAction} onClick={() => window.print()} disabled={!report.headcount}><FileDown size={16} />PDF olarak kaydet</button></div> : null}
      </header>

      <section className={`${ui.surface} ${styles.screenOnly}`} aria-label="Rapor ayarları">
        <div className={styles.bar}>
          <label className={ui.field}><span className={ui.fieldLabel}>Veri kaynağı</span>
            <select className={ui.control} value={source} onChange={(event) => { const value = event.target.value as Source; setSource(value); setDepartment(""); remember({ source: value }); }}>
              {SOURCES.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.value === "all" ? netEntries.length + grossEntries.length : item.value === "net-to-gross" ? netEntries.length : grossEntries.length})</option>)}
            </select>
          </label>
          <label className={ui.field}><span className={ui.fieldLabel}>Yıllık bütçe limiti (₺)</span>
            <input className={ui.control} type="number" min="0" step="1000" inputMode="decimal" placeholder="Opsiyonel" value={budgetLimit || ""} onChange={(event) => { const value = event.target.valueAsNumber || 0; setBudgetLimit(value); remember({ budgetLimit: value }); }} />
          </label>
          <label className={ui.field}><span className={ui.fieldLabel}>Zam senaryosu (%)</span>
            <input className={ui.control} type="number" min="0" max="300" step="0.5" inputMode="decimal" value={raise || ""} placeholder="0" onChange={(event) => setRaise(event.target.valueAsNumber || 0)} />
          </label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman</span>
            <select className={ui.control} value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label className={ui.field}><span className={ui.fieldLabel}>Yaka</span>
            <select className={ui.control} value={workforce} onChange={(event) => setWorkforce(event.target.value)}><option value="">Tümü</option><option value="BLUE_COLLAR">Mavi yaka</option><option value="WHITE_COLLAR">Beyaz yaka</option><option value="NONE">{UNASSIGNED_LABEL}</option></select>
          </label>
        </div>
      </section>

      <div className={styles.printHeader}>
        <div>
          <b>Bütçe Raporu · {parameters.year}</b>
          <span>{companyName} · Kaynak: {sourceLabel} · {report.headcount} personel{filterText ? ` · ${filterText}` : ""}</span>
        </div>
        <span>{reportDate}</span>
      </div>

      {!report.headcount ? (
        <section className={`${ui.surface} ${styles.empty}`}>
          <h2>Raporlanacak personel yok</h2>
          <p>Bütçe raporu Maaş Hesaplama listelerinden beslenir. Önce Netten Brüte veya Brütten Nete listesine personel ve maaş girin; değişiklikler otomatik kaydedilir.</p>
          <div className={ui.headerActions}>
            <Link href="/dashboard/accounting/salary-calculation/net-to-gross" className={ui.secondaryAction}>Netten Brüte listesi</Link>
            <Link href="/dashboard/accounting/salary-calculation/gross-to-net" className={ui.secondaryAction}>Brütten Nete listesi</Link>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.kpis} aria-label="Bütçe özeti">
            {kpis.map((kpi) => (
              <article key={kpi.label} className={styles.kpi}>
                <span>{kpi.label}</span>
                <b className={kpi.tone === "good" ? styles.good : kpi.tone === "bad" ? styles.bad : undefined}>{kpi.value}</b>
                {kpi.hint ? <span>{kpi.hint}</span> : null}
              </article>
            ))}
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <h3>Aylık işveren maliyeti</h3>
              <div className={styles.chart} role="img" aria-label={`Aylık işveren maliyeti; en yüksek ${SALARY_MONTHS[peak]}`}>
                {months.map((month) => (
                  <div key={month.month} title={`${month.label}: ${f2(month.employerCost)}`}>
                    <span>{short(month.employerCost)}</span>
                    <i style={{ height: `${Math.round((month.employerCost / maxMonth) * 120)}px` }} />
                    <span>{month.label.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.card}>
              <h3>Değerlendirme</h3>
              <ul className={styles.insights}>
                <li>Aylık maliyet Ocak&apos;tan Aralık&apos;a <b>{pct(monthCosts[0] ? monthCosts[11] / monthCosts[0] - 1 : 0)}</b> değişiyor (vergi dilimi ve asgari ücret istisnası etkisi).</li>
                <li>En yüksek aylık maliyet <b>{SALARY_MONTHS[peak]}</b> ({f2(monthCosts[peak])}), en düşük <b>{SALARY_MONTHS[low]}</b> ({f2(monthCosts[low])}).</li>
                <li>En yüksek maliyetli {top.length} personel toplam maliyetin <b>{pct(topShare)}</b> kadarını oluşturuyor.</li>
                <li>İşveren, her 1 TL brüt maaşa ek olarak ortalama <b>{report.employerBurdenRate.toLocaleString("tr-TR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TL</b> prim yükü üstleniyor.</li>
                {raiseRate ? <li>%{raise} zam senaryosu yıllık maliyeti <b>{f2(report.annualEmployerCost - baseCost)}</b> artırıyor.</li> : null}
                {budgetLimit > 0
                  ? <li>Yıllık bütçenin <b>{pct(report.annualEmployerCost / budgetLimit)}</b> kadarı kullanılıyor{remaining < 0 ? " — bütçe aşılıyor" : ""}.</li>
                  : <li className={`${styles.muted} ${styles.screenOnly}`}>Bütçe limitini girerek kalan/aşım tutarını görebilirsiniz.</li>}
              </ul>
            </section>
          </div>

          <div className={styles.grid}>
            <GroupTable title="Departman bazında" groups={report.byDepartment} />
            <GroupTable title="Pozisyon bazında" groups={report.byPosition} />
            <GroupTable title="Yaka bazında" groups={report.byWorkforce} />
            <GroupTable title="Çalışan tipi bazında" groups={report.byInsurance} />
            {report.byCategory.some((group) => group.label !== UNASSIGNED_LABEL) ? <GroupTable title="Departman kategorisi bazında" groups={report.byCategory} /> : null}
            <section className={styles.card}>
              <h3>En yüksek maliyetli {top.length} personel</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Ad soyad</th><th>Departman</th><th>Pozisyon</th><th>Yıllık maliyet</th></tr></thead>
                  <tbody>{top.map((person) => (
                    <tr key={person.key}><td className={styles.textCell}>{person.name}</td><td className={styles.textCell}>{person.department ?? "—"}</td><td className={styles.textCell}>{person.position ?? "—"}</td><td>{f2(person.annualEmployerCost)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
            <section className={styles.card}>
              <h3>Aylık özet</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Ay</th><th>Brüt</th><th>Net</th><th>İşveren maliyeti</th><th>Kümülatif</th></tr></thead>
                  <tbody>
                    {months.map((month) => (
                      <tr key={month.month}><td className={styles.textCell}>{month.label}</td><td>{f2(month.gross)}</td><td>{f2(month.net)}</td><td>{f2(month.employerCost)}</td><td>{f2(month.cumulativeEmployerCost)}</td></tr>
                    ))}
                    <tr className={styles.totalRow}><td className={styles.textCell}>TOPLAM</td><td>{f2(report.annualGross)}</td><td>{f2(report.annualNet)}</td><td>{f2(report.annualEmployerCost)}</td><td /></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <p className={styles.note}>Hesaplamalar {parameters.year} gelir vergisi dilimleri, SGK taban/tavanı ve asgari ücret istisnalarıyla (Muhasebe → Sabit Tanımlar) yapılmıştır. İşveren maliyeti = brüt + işveren SGK + işveren işsizlik primi.</p>
        </>
      )}
    </div>
  );
}
