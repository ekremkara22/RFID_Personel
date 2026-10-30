import { AlarmClock, CalendarHeart, Coffee, TimerReset } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import rs from "../reports.module.css";
import { getReportContext, type ReportSearchParams } from "../report-context";
import { totals } from "../report-metrics";
import { BarList, formatDuration, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";

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
    { id: "planned", label: "Planlanan", valueKey: "planned" },
    { id: "worked", label: "Net çalışma", valueKey: "worked" },
    { id: "overtime", label: "Fazla mesai", valueKey: "overtime" },
    { id: "holiday", label: "Tatil çalışması", valueKey: "holiday" },
    { id: "missing", label: "Eksik süre", valueKey: "missing", secondaryKey: "absent" },
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
      worked: formatDuration(row.workedMinutes),
      overtime: formatDuration(row.overtimeMinutes),
      holiday: formatDuration(row.holidayWorkMinutes),
      missing: formatDuration(row.missingMinutes),
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
        <Kpi icon={<TimerReset size={18} />} label="Fazla mesai" value={formatDuration(sum.overtimeMinutes)} hint="Normal iş günlerinde" tone="info" />
        <Kpi icon={<CalendarHeart size={18} />} label="Tatil çalışması" value={formatDuration(sum.holidayWorkMinutes)} hint="Hafta tatili ve resmi tatil" tone="info" />
        <Kpi icon={<AlarmClock size={18} />} label="Eksik süre" value={formatDuration(sum.missingMinutes)} hint={`${sum.absentDays} devamsız gün dahil`} tone="warning" />
        {breakTracking ? <Kpi icon={<Coffee size={18} />} label="Planlananı aşan mola" value={formatDuration(sum.excessBreakMinutes)} hint={data.breakDeductionMode === "PLANNED_AND_EXCESS" ? "Puantajdan düşülür" : "Bilgi amaçlı, puantajdan düşülmez"} tone="neutral" /> : null}
      </KpiGrid>


      <div className={rs.panelGridEven}>
        <Panel title="En çok fazla mesai" description="Fazla mesai ve tatil çalışması toplamı.">
          <BarList tone="info" emptyText="Bu dönemde fazla mesai yok." items={topOvertime.map((row) => ({ label: row.employee, detail: row.department, value: row.overtimeMinutes + row.holidayWorkMinutes, display: formatDuration(row.overtimeMinutes + row.holidayWorkMinutes) }))} />
        </Panel>
        <Panel title="En çok eksik süre" description="Geç gelme, erken çıkma ve devamsızlık dahil.">
          <BarList tone="warning" emptyText="Bu dönemde eksik süre yok." items={topMissing.map((row) => ({ label: row.employee, detail: row.department, value: row.missingMinutes, display: formatDuration(row.missingMinutes) }))} />
        </Panel>
      </div>

      <Panel title="Personel tablosu" aside={<span className={ui.countBadge}>{rows.length} personel</span>}>
        <ReorderableDataTable rows={rows} columns={columns} storageKey={`reports.overtime.columns.${breakTracking ? "break" : "simple"}`} filename={`fazla-mesai-eksik-sure-${ctx.fromKey}-${ctx.toKey}`} emptyMessage="Seçilen filtrelerde personel bulunamadı." canExport={ctx.canExport} minWidth={1000} />
      </Panel>
    </div>
  );
}
