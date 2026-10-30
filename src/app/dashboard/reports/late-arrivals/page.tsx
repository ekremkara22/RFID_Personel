import { LogOut, Timer, UserX, Users } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import rs from "../reports.module.css";
import { formatDayLabel, getReportContext, listDayKeys, type ReportSearchParams } from "../report-context";
import { dailyPresence } from "../report-metrics";
import { BarList, DailyTrend, formatDuration, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";

const COLUMNS: DataTableColumn[] = [
  { id: "date", label: "Tarih", valueKey: "date", secondaryKey: "weekday", kind: "stack" },
  { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "organization", kind: "person" },
  { id: "kind", label: "Olay", valueKey: "kind", toneKey: "tone", kind: "status" },
  { id: "plan", label: "Planlanan", valueKey: "plan" },
  { id: "actual", label: "Gerçekleşen", valueKey: "actual" },
  { id: "minutes", label: "Süre", valueKey: "minutesText", exportValueKey: "minutes" },
];

export default async function LateArrivalsReportPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const ctx = await getReportContext(await props.searchParams);
  const data = await loadAttendanceDays({ companyId: ctx.companyId, employeeWhere: ctx.employeeWhere, fromKey: ctx.fromKey, toKey: ctx.toKey });
  const summaries = summarizeAttendanceDays(data.employees, data.rows, data.companyName).filter((row) => row.plannedDays || row.attendedDays);
  const lateRows = data.rows.filter((row) => row.lateMinutes > 0);
  const earlyRows = data.rows.filter((row) => row.earlyLeaveMinutes > 0);
  const lateMinutes = lateRows.reduce((total, row) => total + row.lateMinutes, 0);
  const earlyMinutes = earlyRows.reduce((total, row) => total + row.earlyLeaveMinutes, 0);
  const presence = dailyPresence(listDayKeys(ctx.fromKey, ctx.toKey), data.rows);
  const repeatLate = summaries.filter((row) => row.lateDays > 0).sort((first, second) => second.lateDays - first.lateDays || second.lateMinutes - first.lateMinutes).slice(0, 10);
  const topEarly = summaries.filter((row) => row.earlyLeaveMinutes > 0).sort((first, second) => second.earlyLeaveMinutes - first.earlyLeaveMinutes).slice(0, 10);

  const events = [
    ...lateRows.map((row) => ({ row, kind: "Geç giriş", tone: "warning", plan: row.plannedStart, actual: row.firstEntry, minutes: row.lateMinutes })),
    ...earlyRows.map((row) => ({ row, kind: "Erken çıkış", tone: "danger", plan: row.plannedEnd, actual: row.lastExit, minutes: row.earlyLeaveMinutes })),
  ].sort((first, second) => second.row.date.localeCompare(first.row.date) || second.minutes - first.minutes).map((item, index) => ({
    id: index,
    date: formatDayLabel(item.row.date, { day: "2-digit", month: "long", year: "numeric" }),
    weekday: formatDayLabel(item.row.date, { weekday: "long" }),
    employee: item.row.employee,
    organization: `${item.row.department} · ${item.row.branch}`,
    kind: item.kind,
    tone: item.tone,
    plan: item.plan,
    actual: item.actual,
    minutesText: formatDuration(item.minutes),
    minutes: item.minutes,
  }));

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader kicker="Raporlar / Mesai uyumu" title="Geç Kalma ve Erken Çıkış" description="Planlanan vardiyaya göre geç giriş ve erken çıkış olayları. Kısmi izinli günler ve takvimde geç kalma kontrolü kapalı günler sayılmaz." />
      <ReportFilters ctx={ctx} showEmployee />

      <KpiGrid>
        <Kpi icon={<Timer size={18} />} label="Geç giriş" value={`${lateRows.length} olay`} hint={formatDuration(lateMinutes)} tone="warning" />
        <Kpi icon={<LogOut size={18} />} label="Erken çıkış" value={`${earlyRows.length} olay`} hint={formatDuration(earlyMinutes)} tone="danger" />
        <Kpi icon={<Users size={18} />} label="Geç kalan personel" value={summaries.filter((row) => row.lateDays).length} hint={`${summaries.length} personelden`} tone="info" />
        <Kpi icon={<UserX size={18} />} label="Ortalama gecikme" value={lateRows.length ? formatDuration(Math.round(lateMinutes / lateRows.length)) : "—"} hint="Geç giriş başına" />
      </KpiGrid>

      <Panel title="Günlük geç kalma" description="Gün bazında işe gelen ve geç kalan personel sayısı.">
        <DailyTrend points={presence.map((day) => ({ dayKey: day.dayKey, value: day.present, secondary: day.late }))} valueLabel="Gelen" secondaryLabel="Geç kalan" />
      </Panel>

      <div className={rs.panelGridEven}>
        <Panel title="En sık geç kalanlar" description="Geç kalınan gün sayısına göre.">
          <BarList tone="warning" emptyText="Bu dönemde geç kalma yok." items={repeatLate.map((row) => ({ label: row.employee, detail: `${row.department} · ${formatDuration(row.lateMinutes)}`, value: row.lateDays, display: `${row.lateDays} gün` }))} />
        </Panel>
        <Panel title="En çok erken çıkanlar" description="Toplam erken çıkış süresine göre.">
          <BarList tone="danger" emptyText="Bu dönemde erken çıkış yok." items={topEarly.map((row) => ({ label: row.employee, detail: row.department, value: row.earlyLeaveMinutes, display: formatDuration(row.earlyLeaveMinutes) }))} />
        </Panel>
      </div>

      <Panel title="Olay listesi" aside={<span className={ui.countBadge}>{events.length} olay</span>}>
        <ReorderableDataTable rows={events} columns={COLUMNS} storageKey="reports.late.columns" filename={`gec-kalma-erken-cikis-${ctx.fromKey}-${ctx.toKey}`} emptyMessage="Seçilen aralıkta geç giriş veya erken çıkış yok." canExport={ctx.canExport} minWidth={900} />
      </Panel>
    </div>
  );
}
