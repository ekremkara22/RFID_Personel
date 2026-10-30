import { AlarmClock, CalendarHeart, Coffee, TimerReset } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import rs from "../reports.module.css";
import { getReportContext, type ReportSearchParams } from "../report-context";
import { totals } from "../report-metrics";
import { BarList, formatDuration, formatHours, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";

export default async function OvertimeReportPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const ctx = await getReportContext(await props.searchParams);
  const data = await loadAttendanceDays({ companyId: ctx.companyId, employeeWhere: ctx.employeeWhere, fromKey: ctx.fromKey, toKey: ctx.toKey });
  const breakTracking = data.trackingMode === "BREAK_TRACKING";
  const summaries = summarizeAttendanceDays(data.employees, data.rows, data.companyName).filter((row) => row.plannedDays || row.attendedDays);
  const sum = totals(summaries);
  const topOvertime = [...summaries].filter((row) => row.overtimeMinutes + row.holidayWorkMinutes > 0).sort((first, second) => (second.overtimeMinutes + second.holidayWorkMinutes) - (first.overtimeMinutes + first.holidayWorkMinutes)).slice(0, 10);
  const topMissing = [...summaries].filter((row) => row.missingMinutes > 0).sort((first, second) => second.missingMinutes - first.missingMinutes).slice(0, 10);

  const columns: DataTableColumn[] = [
    { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "organization", kind: "person" },
    { id: "planned", label: "Planlanan", valueKey: "planned", exportValueKey: "plannedHours" },
    { id: "worked", label: "Net çalışma", valueKey: "worked", exportValueKey: "workedHours" },
    { id: "overtime", label: "Fazla mesai", valueKey: "overtime", exportValueKey: "overtimeHours" },
    { id: "holiday", label: "Tatil çalışması", valueKey: "holiday", exportValueKey: "holidayHours" },
    { id: "missing", label: "Eksik süre", valueKey: "missing", exportValueKey: "missingHours", secondaryKey: "absent" },
    ...(breakTracking ? [{ id: "excessBreak", label: "Aşan mola", valueKey: "excessBreak", exportValueKey: "excessBreakMinutes" }] : []),
    { id: "balance", label: "Fark", valueKey: "balance", toneKey: "tone", kind: "status" as const },
  ];
  const rows = summaries.map((row) => {
    const balance = row.overtimeMinutes + row.holidayWorkMinutes - row.missingMinutes;
    return {
      id: row.employeeId,
      employee: row.employee,
      organization: `${row.department} · ${row.branch}`,
      planned: formatDuration(row.plannedMinutes),
      plannedHours: formatHours(row.plannedMinutes),
      worked: formatDuration(row.workedMinutes),
      workedHours: formatHours(row.workedMinutes),
      overtime: formatDuration(row.overtimeMinutes),
      overtimeHours: formatHours(row.overtimeMinutes),
      holiday: formatDuration(row.holidayWorkMinutes),
      holidayHours: formatHours(row.holidayWorkMinutes),
      missing: formatDuration(row.missingMinutes),
      missingHours: formatHours(row.missingMinutes),
      absent: row.missingDays ? `${row.missingDays} gün devamsız` : null,
      excessBreak: formatDuration(row.excessBreakMinutes),
      excessBreakMinutes: row.excessBreakMinutes,
      balance: `${balance >= 0 ? "+" : "−"}${formatDuration(Math.abs(balance))}`,
      tone: balance > 0 ? "success" : balance < 0 ? "warning" : "neutral",
    };
  });

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader kicker="Raporlar / Süre" title="Fazla Mesai ve Eksik Süre" description="Planlanan net sürenin üstündeki her dakika fazla mesai, altındaki eksik süre sayılır. Tatil günü çalışması ayrı gösterilir." />
      <ReportFilters ctx={ctx} showEmployee />

      <KpiGrid>
        <Kpi icon={<TimerReset size={18} />} label="Fazla mesai" value={`${formatHours(sum.overtimeMinutes)} sa`} hint="Normal iş günlerinde" tone="info" />
        <Kpi icon={<CalendarHeart size={18} />} label="Tatil çalışması" value={`${formatHours(sum.holidayWorkMinutes)} sa`} hint="Hafta tatili ve resmi tatil" tone="info" />
        <Kpi icon={<AlarmClock size={18} />} label="Eksik süre" value={`${formatHours(sum.missingMinutes)} sa`} hint={`${sum.absentDays} devamsız gün dahil`} tone="warning" />
        {breakTracking ? <Kpi icon={<Coffee size={18} />} label="Planlananı aşan mola" value={formatDuration(sum.excessBreakMinutes)} hint={data.breakDeductionMode === "PLANNED_AND_EXCESS" ? "Puantajdan düşülür" : "Bilgi amaçlı, puantajdan düşülmez"} tone="neutral" /> : null}
      </KpiGrid>


      <div className={rs.panelGridEven}>
        <Panel title="En çok fazla mesai" description="Fazla mesai ve tatil çalışması toplamı.">
          <BarList tone="info" emptyText="Bu dönemde fazla mesai yok." items={topOvertime.map((row) => ({ label: row.employee, detail: row.department, value: row.overtimeMinutes + row.holidayWorkMinutes, display: `${formatHours(row.overtimeMinutes + row.holidayWorkMinutes)} sa` }))} />
        </Panel>
        <Panel title="En çok eksik süre" description="Geç gelme, erken çıkma ve devamsızlık dahil.">
          <BarList tone="warning" emptyText="Bu dönemde eksik süre yok." items={topMissing.map((row) => ({ label: row.employee, detail: row.department, value: row.missingMinutes, display: `${formatHours(row.missingMinutes)} sa` }))} />
        </Panel>
      </div>

      <Panel title="Personel tablosu" aside={<span className={ui.countBadge}>{rows.length} personel</span>}>
        <ReorderableDataTable rows={rows} columns={columns} storageKey={`reports.overtime.columns.${breakTracking ? "break" : "simple"}`} filename={`fazla-mesai-eksik-sure-${ctx.fromKey}-${ctx.toKey}`} emptyMessage="Seçilen filtrelerde personel bulunamadı." canExport={ctx.canExport} minWidth={1000} />
      </Panel>
    </div>
  );
}
