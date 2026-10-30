import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { PUANTAJ_DAY_CODE_LABELS, type PuantajDayCode } from "@/lib/attendance-day-calculation";
import ui from "../management.module.css";
import styles from "./reports.module.css";
import { formatDayLabel, type ReportContext } from "./report-context";

/** 615 → "10 sa 15 dk" */
export function formatDuration(minutes: number) {
  if (!minutes) return "0 dk";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} dk`;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function formatPercent(value: number, total: number) {
  return total ? `%${Math.round((value / total) * 100)}` : "—";
}

export function ReportHeader(props: { kicker: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className={ui.pageHeader}>
      <div className={ui.headerCopy}>
        <p className={ui.kicker}>{props.kicker}</p>
        <h1 className={ui.pageTitle}>{props.title}</h1>
        <p className={ui.pageDescription}>{props.description}</p>
      </div>
      {props.actions ? <div className={ui.headerActions}>{props.actions}</div> : null}
    </header>
  );
}

/** Tarih aralığı, şube, departman ve (isteğe bağlı) personel filtresi. */
export function ReportFilters(props: { ctx: ReportContext; showEmployee?: boolean; dateMode?: "range" | "day" | "month"; monthKey?: string; children?: ReactNode }) {
  const { ctx, dateMode = "range" } = props;
  return (
    <section className={ui.surface} aria-label="Rapor filtreleri">
      <form className={styles.filterBar}>
        {dateMode === "range" ? <>
          <label className={ui.field}><span className={ui.fieldLabel}>Başlangıç</span><input className={ui.control} type="date" name="from" defaultValue={ctx.fromKey} max={ctx.todayKey} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Bitiş</span><input className={ui.control} type="date" name="to" defaultValue={ctx.toKey} max={ctx.todayKey} /></label>
        </> : dateMode === "day" ? (
          <label className={ui.field}><span className={ui.fieldLabel}>Tarih</span><input className={ui.control} type="date" name="to" defaultValue={ctx.toKey} max={ctx.todayKey} /></label>
        ) : (
          <label className={ui.field}><span className={ui.fieldLabel}>Dönem</span><input className={ui.control} type="month" name="month" defaultValue={props.monthKey} max={ctx.todayKey.slice(0, 7)} /></label>
        )}
        <label className={ui.field}><span className={ui.fieldLabel}>Şube</span><select className={ui.control} name="branch" defaultValue={ctx.branch}><option value="">Tüm şubeler</option>{ctx.branches.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label className={ui.field}><span className={ui.fieldLabel}>Departman</span><select className={ui.control} name="department" defaultValue={ctx.department}><option value="">Tüm departmanlar</option>{ctx.departments.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        {props.showEmployee ? <label className={ui.field}><span className={ui.fieldLabel}>Personel</span><select className={ui.control} name="employeeId" defaultValue={ctx.employeeId ?? ""}><option value="">Tüm personel</option>{ctx.employees.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (pasif)"}</option>)}</select></label> : null}
        {props.children}
        <button className={ui.filterButton} type="submit"><Filter size={15} />Göster</button>
      </form>
    </section>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function KpiGrid({ children }: { children: ReactNode }) {
  return <section className={styles.kpiGrid}>{children}</section>;
}

export function Kpi(props: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <article className={styles.kpi} data-tone={props.tone ?? "neutral"}>
      <span className={styles.kpiIcon}>{props.icon}</span>
      <div className={styles.kpiBody}>
        <p className={styles.kpiLabel}>{props.label}</p>
        <p className={styles.kpiValue}>{props.value}</p>
        {props.hint ? <p className={styles.kpiHint}>{props.hint}</p> : null}
      </div>
    </article>
  );
}

export function Panel(props: { title: string; description?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${ui.surface} ${props.className ?? ""}`}>
      <div className={ui.sectionHeading}>
        <div><h2>{props.title}</h2>{props.description ? <p>{props.description}</p> : null}</div>
        {props.aside}
      </div>
      {props.children}
    </section>
  );
}

/** Yatay çubuklu sıralı liste (en çok geç kalanlar, departman karşılaştırması vb.). */
export function BarList(props: { items: Array<{ label: string; detail?: string; value: number; display: string }>; tone?: Tone; emptyText: string }) {
  const max = Math.max(1, ...props.items.map((item) => item.value));
  if (props.items.length === 0) return <p className={styles.emptyText}>{props.emptyText}</p>;
  return (
    <ol className={styles.barList}>
      {props.items.map((item) => (
        <li key={`${item.label}-${item.detail ?? ""}`}>
          <div className={styles.barLabel}><strong>{item.label}</strong>{item.detail ? <span>{item.detail}</span> : null}</div>
          <div className={styles.barTrack} aria-hidden="true"><span data-tone={props.tone ?? "info"} style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} /></div>
          <span className={styles.barValue}>{item.display}</span>
        </li>
      ))}
    </ol>
  );
}

const MAX_PRESENCE_DAYS = 62;

/** Gün kutucukları: her gün gelen/planlı personel ve devam oranı; renk orana göre değişir. */
export function DailyPresenceTiles(props: { days: Array<{ dayKey: string; planned: number; present: number }> }) {
  if (props.days.length > MAX_PRESENCE_DAYS) {
    return <p className={styles.emptyText}>Gün gün görünüm en çok {MAX_PRESENCE_DAYS} günlük aralıkta gösterilir. Aralığı daraltın.</p>;
  }
  return (
    <>
      <ol className={styles.dayTiles}>
        {props.days.map((day) => {
          const rate = day.planned ? day.present / day.planned : null;
          const tone = rate === null ? (day.present ? "info" : "off") : rate >= 0.9 ? "success" : rate >= 0.6 ? "warning" : "danger";
          return (
            <li key={day.dayKey} className={styles.dayTile} data-tone={tone} title={`${formatDayLabel(day.dayKey, { day: "2-digit", month: "long", weekday: "long" })}: ${day.present} gelen / ${day.planned} planlı`}>
              <span className={styles.dayTileDate}>{formatDayLabel(day.dayKey, { day: "2-digit", month: "2-digit" })}<small>{formatDayLabel(day.dayKey, { weekday: "short" })}</small></span>
              <strong>{rate === null ? (day.present ? day.present : "—") : `%${Math.round(rate * 100)}`}</strong>
              <span className={styles.dayTileCount}>{day.planned ? `${day.present}/${day.planned}` : day.present ? `${day.present} çalışan` : "Plan yok"}</span>
            </li>
          );
        })}
      </ol>
      <ul className={styles.tileLegend} aria-label="Renk açıklaması">
        <li data-tone="success">%90 ve üzeri</li>
        <li data-tone="warning">%60–89</li>
        <li data-tone="danger">%60 altı</li>
        <li data-tone="off">Planlı çalışma yok</li>
      </ul>
    </>
  );
}

export function DayCode({ code, title }: { code: PuantajDayCode; title?: string }) {
  if (!code) return <span className={styles.dayCodeEmpty} title={title}>·</span>;
  return <span className={styles.dayCode} data-code={code} title={title ?? PUANTAJ_DAY_CODE_LABELS[code]}>{code}</span>;
}

export function DayCodeLegend() {
  return (
    <ul className={styles.codeLegend} aria-label="Puantaj kodları">
      {(Object.keys(PUANTAJ_DAY_CODE_LABELS) as Array<Exclude<PuantajDayCode, "">>).map((code) => (
        <li key={code}><DayCode code={code} />{PUANTAJ_DAY_CODE_LABELS[code]}</li>
      ))}
    </ul>
  );
}

export function ExportLink(props: { href: string; label: string; icon: ReactNode }) {
  return <a className={ui.secondaryAction} href={props.href}>{props.icon}{props.label}</a>;
}
