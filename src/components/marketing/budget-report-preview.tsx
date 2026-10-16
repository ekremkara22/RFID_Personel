import styles from "./budget-preview.module.css";

/*
 * Static picture of the Muhasebe > Bütçe Raporu screen with sample data (24 people, 2026).
 * Figures are internally consistent: brüt 14.892.000, net 11.020.080, işveren maliyeti 17.855.508.
 */
const KPIS = [
  { label: "Personel", value: "24" },
  { label: "Yıllık işveren maliyeti", value: "17.855.508 ₺" },
  { label: "Kişi başı aylık maliyet", value: "61.998 ₺" },
  { label: "Bütçe kalan", value: "1.144.492 ₺", hint: "Kullanım %94", good: true },
];

const ANATOMY = [
  { label: "Çalışana net", value: 61.7, tone: "a" },
  { label: "SGK + işsizlik (işçi)", value: 12.5, tone: "b" },
  { label: "Gelir + damga vergisi", value: 9.2, tone: "c" },
  { label: "İşveren primi", value: 16.6, tone: "d" },
] as const;

const DEPARTMENTS = [
  { label: "Üretim", share: 38 },
  { label: "Satış", share: 22 },
  { label: "Lojistik", share: 15 },
  { label: "Muhasebe", share: 13 },
  { label: "Yönetim", share: 12 },
];

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
// Employer cost stays flat each month; the net share shrinks as the cumulative tax base climbs brackets.
const NET_SHARE = [65.5, 65.5, 65, 64, 62.5, 62, 61.5, 60.5, 59.5, 59, 58.5, 57];
const EMPLOYEE_SSI_SHARE = 12.5;
const EMPLOYER_SHARE = 16.6;

const DONUT_COLORS = ["#1f4e79", "#3f7cb5", "#7ea8d1", "#b9cfe4", "#dbe6f1"];

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DONUT_SEGMENTS = DEPARTMENTS.map((department, index) => {
  const start = DEPARTMENTS.slice(0, index).reduce((sum, item) => sum + item.share, 0);
  return { label: department.label, length: (department.share / 100) * CIRCUMFERENCE, offset: (start / 100) * CIRCUMFERENCE };
});

function Donut() {
  return (
    <svg viewBox="0 0 100 100" className={styles.donut} aria-hidden="true">
      {DONUT_SEGMENTS.map((segment, index) => (
        <circle key={segment.label} cx="50" cy="50" r={RADIUS} fill="none" stroke={DONUT_COLORS[index]} strokeWidth="14"
          strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 50 50)" />
      ))}
      <text x="50" y="48" textAnchor="middle" className={styles.donutValue}>5</text>
      <text x="50" y="60" textAnchor="middle" className={styles.donutLabel}>departman</text>
    </svg>
  );
}

export function BudgetReportPreview() {
  return (
    <div className={styles.frame} role="img" aria-label="Flodeska Muhasebe bütçe raporu ekranı, örnek verilerle: 24 personel, yıllık işveren maliyeti 17,9 milyon TL, departman dağılımı ve aylık maliyet grafiği">
      <div className={styles.bar}>
        <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.crumb}>Muhasebe / <b>Bütçe Raporu</b></span>
        <span className={styles.sample}>Örnek veri</span>
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <div>
            <strong>Bütçe Raporu · 2026</strong>
            <span>Örnek Tekstil A.Ş. · Netten brüte ve brütten nete listeleri birleşik</span>
          </div>
          <span className={styles.tag}>Yıllık bütçe limiti: 19.000.000 ₺</span>
        </div>

        <div className={styles.kpis}>
          {KPIS.map((kpi) => (
            <div key={kpi.label} className={styles.kpi}>
              <span>{kpi.label}</span>
              <b className={kpi.good ? styles.good : undefined}>{kpi.value}</b>
              {kpi.hint ? <small>{kpi.hint}</small> : null}
            </div>
          ))}
        </div>

        <div className={styles.panel}>
          <span className={styles.panelTitle}>Her 100 ₺ işveren maliyeti nereye gidiyor?</span>
          <div className={styles.anatomy}>
            {ANATOMY.map((part) => <span key={part.label} className={styles[`tone_${part.tone}`]} style={{ flexBasis: `${part.value}%` }}>{part.value.toLocaleString("tr-TR")}</span>)}
          </div>
          <div className={styles.legend}>
            {ANATOMY.map((part) => <span key={part.label}><i className={styles[`tone_${part.tone}`]} />{part.label}</span>)}
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.panel}>
            <span className={styles.panelTitle}>Departman payı</span>
            <div className={styles.donutRow}>
              <Donut />
              <ul className={styles.shareList}>
                {DEPARTMENTS.map((department, index) => (
                  <li key={department.label}><i style={{ background: DONUT_COLORS[index] }} />{department.label}<b>%{department.share}</b></li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles.panel}>
            <span className={styles.panelTitle}>Aylık maliyetin dağılımı</span>
            <div className={styles.columns}>
              {NET_SHARE.map((net, index) => (
                <div key={MONTHS[index]} className={styles.column}>
                  <span className={styles.columnBar}>
                    <span style={{ height: `${net}%` }} className={styles.tone_a} />
                    <span style={{ height: `${EMPLOYEE_SSI_SHARE}%` }} className={styles.tone_b} />
                    <span style={{ height: `${100 - net - EMPLOYEE_SSI_SHARE - EMPLOYER_SHARE}%` }} className={styles.tone_c} />
                    <span style={{ height: `${EMPLOYER_SHARE}%` }} className={styles.tone_d} />
                  </span>
                  <small>{MONTHS[index]}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
