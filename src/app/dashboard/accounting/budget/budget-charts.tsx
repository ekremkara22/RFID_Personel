"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BudgetGroup, BudgetMonth } from "@/lib/budget-report";
import styles from "./budget.module.css";

/**
 * Proportional budget visuals (cost anatomy bar, department donut, monthly stacked columns).
 * Charts measure their container and draw at real pixel size, so text and strokes stay crisp
 * at every width; the donut is square and scales with its viewBox. Colors are the validated
 * categorical slots (dataviz reference palette, light mode) assigned in fixed order.
 */
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"] as const;
const OTHER_COLOR = "#98a2b3";
const MAX_DEPARTMENTS = SERIES.length;

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const pct = (value: number) => `%${(value * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
const compact = (value: number) => value >= 1e6
  ? `${(value / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`
  : value >= 1e3 ? `${Math.round(value / 1e3).toLocaleString("tr-TR")} B` : Math.round(value).toLocaleString("tr-TR");

/** Width of the element, updated on resize (0 until mounted). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type Tip = { x: number; y: number; content: ReactNode } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return <div className={styles.tooltip} style={{ left: tip.x, top: tip.y }} role="status">{tip.content}</div>;
}

// ---------------------------------------------------------------------------
// Cost anatomy: where every lira of employer cost goes
// ---------------------------------------------------------------------------

export function CostAnatomy({ net, gross, employerCost, headcount }: { net: number; gross: number; employerCost: number; headcount: number }) {
  const parts = [
    { key: "net", label: "Çalışana net ödenen", value: net, color: SERIES[0] },
    { key: "deductions", label: "Gelir vergisi, damga ve çalışan SGK", value: Math.max(gross - net, 0), color: SERIES[1] },
    { key: "employer", label: "İşveren SGK ve işsizlik primi", value: Math.max(employerCost - gross, 0), color: SERIES[2] },
  ];
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <section className={`${styles.card} ${styles.anatomy}`} aria-labelledby="cost-anatomy-title">
      <div className={styles.anatomyHead}>
        <div>
          <h3 id="cost-anatomy-title">Maliyet dağılımı</h3>
          <p className={styles.cardHint}>İşverenin ödediği her 100 ₺&apos;nin nereye gittiği</p>
        </div>
        <div className={styles.hero}>
          <span>Yıllık işveren maliyeti</span>
          <b>{money.format(employerCost)}</b>
          <span>{headcount} personel · kişi başı aylık {money.format(headcount ? employerCost / headcount / 12 : 0)}</span>
        </div>
      </div>
      <div className={styles.stackBar} role="img" aria-label={parts.map((part) => `${part.label} ${pct(part.value / total)}`).join(", ")}>
        {parts.map((part) => (
          <span key={part.key} style={{ flexGrow: part.value, background: part.color }} title={`${part.label}: ${money.format(part.value)} (${pct(part.value / total)})`}>
            {part.value / total >= 0.08 ? <b>{Math.round((part.value / total) * 100)} ₺</b> : null}
          </span>
        ))}
      </div>
      <ul className={styles.legend}>
        {parts.map((part) => (
          <li key={part.key}>
            <i style={{ background: part.color }} aria-hidden="true" />
            <span>{part.label}</span>
            <b>{pct(part.value / total)}</b>
            <small>{money.format(part.value)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Department donut
// ---------------------------------------------------------------------------

function arcPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const point = (radius: number, angle: number) => [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = point(outer, start);
  const [x2, y2] = point(outer, end);
  const [x3, y3] = point(inner, end);
  const [x4, y4] = point(inner, start);
  return `M${x1} ${y1}A${outer} ${outer} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${inner} ${inner} 0 ${large} 0 ${x4} ${y4}Z`;
}

export function DepartmentDonut({ groups, total }: { groups: BudgetGroup[]; total: number }) {
  const [active, setActive] = useState<string | null>(null);
  // Color follows the department (cost order of the full list), extra departments fold into "Diğer".
  const shown = groups.slice(0, groups.length > MAX_DEPARTMENTS ? MAX_DEPARTMENTS - 1 : MAX_DEPARTMENTS);
  const rest = groups.slice(shown.length);
  const slices = [
    ...shown.map((group, index) => ({ key: group.key, label: group.label, cost: group.annualEmployerCost, headcount: group.headcount, share: group.share, color: SERIES[index] })),
    ...(rest.length ? [{ key: "__other", label: `Diğer (${rest.length} departman)`, cost: rest.reduce((sum, item) => sum + item.annualEmployerCost, 0), headcount: rest.reduce((sum, item) => sum + item.headcount, 0), share: rest.reduce((sum, item) => sum + item.share, 0), color: OTHER_COLOR }] : []),
  ];
  const size = 240;
  const center = size / 2;
  const gap = slices.length > 1 ? 0.012 : 0;
  let angle = 0;
  const arcs = slices.map((slice) => {
    const sweep = slice.share * Math.PI * 2;
    const start = angle + gap / 2;
    const end = Math.max(angle + sweep - gap / 2, start + 0.001);
    angle += sweep;
    return { ...slice, path: slice.share >= 0.9999 ? null : arcPath(center, center, 112, 72, start, end) };
  });
  const focus = slices.find((slice) => slice.key === active);

  return (
    <section className={`${styles.card} ${styles.chartCard}`} aria-labelledby="department-donut-title">
      <h3 id="department-donut-title">Departman bazında maliyet</h3>
      <p className={styles.cardHint}>Yıllık işveren maliyetinin departmanlara dağılımı</p>
      <div className={styles.donutLayout}>
        <svg className={styles.donut} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map((slice) => `${slice.label} ${pct(slice.share)}`).join(", ")}>
          {arcs.map((arc) => arc.path
            ? <path key={arc.key} d={arc.path} fill={arc.color} opacity={active && active !== arc.key ? 0.35 : 1} onMouseEnter={() => setActive(arc.key)} onMouseLeave={() => setActive(null)}><title>{`${arc.label}: ${money.format(arc.cost)} (${pct(arc.share)})`}</title></path>
            : <circle key={arc.key} cx={center} cy={center} r={92} fill="none" stroke={arc.color} strokeWidth={40} />)}
          <text x={center} y={center - 10} textAnchor="middle" className={styles.donutLabel}>{focus ? focus.label.slice(0, 22) : "Toplam"}</text>
          <text x={center} y={center + 16} textAnchor="middle" className={styles.donutValue}>{compact(focus ? focus.cost : total)} ₺</text>
          <text x={center} y={center + 36} textAnchor="middle" className={styles.donutLabel}>{focus ? `${pct(focus.share)} · ${focus.headcount} kişi` : `${slices.length} grup`}</text>
        </svg>
        <ul className={styles.rankList}>
          {slices.map((slice) => (
            <li key={slice.key} className={active === slice.key ? styles.rankActive : undefined} onMouseEnter={() => setActive(slice.key)} onMouseLeave={() => setActive(null)}>
              <div className={styles.rankRow}>
                <i style={{ background: slice.color }} aria-hidden="true" />
                <span className={styles.rankName}>{slice.label}</span>
                <b>{pct(slice.share)}</b>
              </div>
              <div className={styles.rankTrack}><span style={{ width: `${Math.max(slice.share * 100, 1)}%`, background: slice.color }} /></div>
              <small>{money.format(slice.cost)} · {slice.headcount} kişi</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Monthly stacked columns (net / deductions / employer premiums)
// ---------------------------------------------------------------------------

const MONTH_SERIES = [
  { key: "net", label: "Net ödeme", color: SERIES[0] },
  { key: "deductions", label: "Vergi ve kesintiler", color: SERIES[1] },
  { key: "employer", label: "İşveren primleri", color: SERIES[2] },
] as const;

function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((item) => item * power >= value)!;
  return step * power;
}

export function MonthlyStack({ months }: { months: BudgetMonth[] }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const height = 280;
  const pad = { top: 16, right: 8, bottom: 30, left: 52 };
  const plotWidth = Math.max(width - pad.left - pad.right, 0);
  const plotHeight = height - pad.top - pad.bottom;
  const rows = months.map((month) => ({
    month,
    values: [month.net, Math.max(month.gross - month.net, 0), Math.max(month.employerCost - month.gross, 0)],
  }));
  const max = niceMax(Math.max(1, ...months.map((month) => month.employerCost)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * max);
  const slot = plotWidth / Math.max(months.length, 1);
  const barWidth = Math.max(Math.min(slot * 0.62, 44), 6);
  const narrow = width < 520;
  const y = (value: number) => pad.top + plotHeight - (value / max) * plotHeight;

  return (
    <section className={`${styles.card} ${styles.chartCard}`} aria-labelledby="monthly-stack-title">
      <h3 id="monthly-stack-title">Aylık maliyet özeti</h3>
      <p className={styles.cardHint}>Her ayın işveren maliyeti; net ödeme, vergi-kesinti ve işveren primi olarak</p>
      <ul className={styles.legendInline}>
        {MONTH_SERIES.map((series) => <li key={series.key}><i style={{ background: series.color }} aria-hidden="true" />{series.label}</li>)}
      </ul>
      <div ref={wrapRef} className={styles.plot} onMouseLeave={() => { setTip(null); setHover(null); }}>
        {width > 0 ? (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Aylık işveren maliyeti, en yüksek ${money.format(Math.max(...months.map((month) => month.employerCost)))}`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={pad.left} x2={pad.left + plotWidth} y1={y(tick)} y2={y(tick)} className={tick === 0 ? styles.axisLine : styles.gridLine} />
                <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" className={styles.axisText}>{compact(tick)}</text>
              </g>
            ))}
            {rows.map((row, index) => {
              const x = pad.left + slot * index + (slot - barWidth) / 2;
              let base = 0;
              const segments = row.values.map((value, seriesIndex) => {
                const top = base + value;
                const rect = { y: y(top), h: Math.max(y(base) - y(top) - (seriesIndex ? 2 : 0), 0), color: MONTH_SERIES[seriesIndex].color, last: seriesIndex === row.values.length - 1 };
                base = top;
                return rect;
              });
              return (
                <g key={row.month.month} opacity={hover !== null && hover !== index ? 0.45 : 1}>
                  {segments.map((segment, seriesIndex) => segment.last
                    ? <path key={seriesIndex} d={`M${x} ${segment.y + segment.h}V${segment.y + 4}a4 4 0 0 1 4 -4H${x + barWidth - 4}a4 4 0 0 1 4 4V${segment.y + segment.h}Z`} fill={segment.color} />
                    : <rect key={seriesIndex} x={x} y={segment.y} width={barWidth} height={segment.h} fill={segment.color} />)}
                  <text x={x + barWidth / 2} y={pad.top + plotHeight + 18} textAnchor="middle" className={styles.axisText}>{narrow ? row.month.label.slice(0, 1) : row.month.label.slice(0, 3)}</text>
                  <rect
                    x={pad.left + slot * index}
                    y={pad.top}
                    width={slot}
                    height={plotHeight}
                    fill="transparent"
                    onMouseMove={(event) => {
                      const box = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setHover(index);
                      setTip({
                        x: Math.min(event.clientX - box.left + 12, width - 190),
                        y: Math.max(event.clientY - box.top - 70, 0),
                        content: (
                          <>
                            <b>{row.month.label}</b>
                            {MONTH_SERIES.map((series, seriesIndex) => <span key={series.key}><i style={{ background: series.color }} />{series.label}<em>{money.format(row.values[seriesIndex])}</em></span>)}
                            <span className={styles.tooltipTotal}>Toplam maliyet<em>{money.format(row.month.employerCost)}</em></span>
                          </>
                        ),
                      });
                    }}
                  />
                </g>
              );
            })}
          </svg>
        ) : <div style={{ height }} />}
        <Tooltip tip={tip} />
      </div>
    </section>
  );
}
