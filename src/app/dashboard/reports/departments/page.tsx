import { LayoutList, Timer, TimerReset, UserCheck } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import rs from "../reports.module.css";
import { getReportContext, type ReportSearchParams } from "../report-context";
import { attendanceRatio, groupByDepartment } from "../report-metrics";
import { BarList, formatDuration, formatHours, formatPercent, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";

const COLUMNS: DataTableColumn[] = [
  { id: "department", label: "Departman", valueKey: "department", secondaryKey: "employees", kind: "stack" },
  { id: "rate", label: "Devam oranı", valueKey: "rate", secondaryKey: "days" },
  { id: "worked", label: "Net çalışma", valueKey: "worked", exportValueKey: "workedHours", secondaryKey: "perPerson" },
  { id: "overtime", label: "Fazla mesai", valueKey: "overtime", exportValueKey: "overtimeHours" },
  { id: "missing", label: "Eksik süre", valueKey: "missing", exportValueKey: "missingHours" },
  { id: "late", label: "Geç kalma", valueKey: "late", secondaryKey: "lateRate" },
  { id: "leave", label: "İzin / devamsız", valueKey: "leave" },
  { id: "control", label: "Kontrol", valueKey: "control", toneKey: "tone", kind: "status" },
];

export default async function DepartmentReportPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const ctx = await getReportContext(await props.searchParams);
  const data = await loadAttendanceDays({ companyId: ctx.companyId, employeeWhere: ctx.employeeWhere, fromKey: ctx.fromKey, toKey: ctx.toKey });
  const summaries = summarizeAttendanceDays(data.employees, data.rows, data.companyName).filter((row) => row.plannedDays || row.attendedDays);
  const departments = groupByDepartment(summaries, data.rows).sort((first, second) => first.department.localeCompare(second.department, "tr"));
  const ratio = attendanceRatio(data.rows);
  const lateDays = departments.reduce((total, item) => total + item.totals.lateDays, 0);
  const overtime = departments.reduce((total, item) => total + item.totals.overtimeMinutes + item.totals.holidayWorkMinutes, 0);

  const rows = departments.map((item) => ({
    id: item.department,
    department: item.department,
    employees: `${item.totals.employees} personel`,
    rate: formatPercent(item.ratio.attended, item.ratio.planned),
    days: `${item.ratio.attended} / ${item.ratio.planned} planlı gün`,
    worked: formatDuration(item.totals.workedMinutes),
    workedHours: formatHours(item.totals.workedMinutes),
    perPerson: item.totals.employees ? `Kişi başı ${formatHours(item.totals.workedMinutes / item.totals.employees)} sa` : null,
    overtime: formatDuration(item.totals.overtimeMinutes + item.totals.holidayWorkMinutes),
    overtimeHours: formatHours(item.totals.overtimeMinutes + item.totals.holidayWorkMinutes),
    missing: formatDuration(item.totals.missingMinutes),
    missingHours: formatHours(item.totals.missingMinutes),
    late: `${item.totals.lateDays} gün · ${formatDuration(item.totals.lateMinutes)}`,
    lateRate: `Geç kalma oranı ${formatPercent(item.totals.lateDays, item.ratio.attended)}`,
    leave: `${item.totals.leaveDays} izin · ${item.totals.absentDays} devamsız`,
    control: item.totals.errorDays ? `${item.totals.errorDays} gün` : "Yok",
    tone: item.totals.errorDays ? "danger" : "success",
  }));

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader kicker="Raporlar / Departman" title="Departman Karşılaştırma" description="Departmanların devam oranı, çalışma süresi, geç kalma ve fazla mesai karşılaştırması." />
      <ReportFilters ctx={ctx} />

      <KpiGrid>
        <Kpi icon={<LayoutList size={18} />} label="Departman" value={departments.length} hint={`${summaries.length} personel`} tone="info" />
        <Kpi icon={<UserCheck size={18} />} label="Genel devam oranı" value={formatPercent(ratio.attended, ratio.planned)} hint={`${ratio.attended} / ${ratio.planned} planlı gün`} tone="success" />
        <Kpi icon={<Timer size={18} />} label="Geç kalınan gün" value={lateDays} tone="warning" />
        <Kpi icon={<TimerReset size={18} />} label="Fazla mesai" value={`${formatHours(overtime)} sa`} tone="info" />
      </KpiGrid>

      <div className={rs.panelGridEven}>
        <Panel title="Devam oranı" description="Planlı iş günlerinde işe gelme oranı.">
          <BarList tone="success" emptyText="Departman verisi yok." items={departments.map((item) => ({ label: item.department, detail: `${item.totals.employees} personel`, value: item.ratio.planned ? item.ratio.attended / item.ratio.planned : 0, display: formatPercent(item.ratio.attended, item.ratio.planned) }))} />
        </Panel>
        <Panel title="Geç kalma süresi" description="Departman toplamı.">
          <BarList tone="warning" emptyText="Bu dönemde geç kalma yok." items={departments.filter((item) => item.totals.lateMinutes).map((item) => ({ label: item.department, detail: `${item.totals.lateDays} gün`, value: item.totals.lateMinutes, display: formatDuration(item.totals.lateMinutes) }))} />
        </Panel>
      </div>

      <Panel title="Departman tablosu" aside={<span className={ui.countBadge}>{rows.length} departman</span>}>
        <ReorderableDataTable rows={rows} columns={COLUMNS} storageKey="reports.departments.columns" filename={`departman-karsilastirma-${ctx.fromKey}-${ctx.toKey}`} emptyMessage="Seçilen filtrelerde departman verisi bulunamadı." canExport={ctx.canExport} minWidth={1040} />
      </Panel>
    </div>
  );
}
