import { AlarmClock, Clock3, TimerReset, UserCheck } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { PUANTAJ_DAY_CODE_LABELS } from "@/lib/attendance-day-calculation";
import { loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import { getReportContext, formatDayLabel, type ReportSearchParams } from "../report-context";
import { attendanceRatio, totals } from "../report-metrics";
import { formatDuration, formatHours, formatPercent, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";

const SUMMARY_COLUMNS: DataTableColumn[] = [
  { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "organization", kind: "person" },
  { id: "days", label: "Planlı / Gelinen", valueKey: "days", secondaryKey: "rate" },
  { id: "worked", label: "Net çalışma", valueKey: "worked", exportValueKey: "workedHours", secondaryKey: "planned" },
  { id: "overtime", label: "Fazla mesai", valueKey: "overtime", exportValueKey: "overtimeHours", secondaryKey: "holiday" },
  { id: "missing", label: "Eksik süre", valueKey: "missing", exportValueKey: "missingHours" },
  { id: "late", label: "Geç / erken", valueKey: "late", secondaryKey: "early" },
  { id: "leave", label: "İzin / devamsız", valueKey: "leave", secondaryKey: "absent" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "tone", kind: "status" },
];

const DAY_COLUMNS: DataTableColumn[] = [
  { id: "date", label: "Tarih", valueKey: "date", secondaryKey: "weekday", kind: "stack" },
  { id: "code", label: "Durum", valueKey: "codeLabel", toneKey: "tone", kind: "status" },
  { id: "times", label: "Giriş / çıkış", valueKey: "times", secondaryKey: "plan" },
  { id: "worked", label: "Net çalışma", valueKey: "worked", exportValueKey: "workedMinutes", secondaryKey: "breakText" },
  { id: "diff", label: "Fazla / eksik", valueKey: "diff" },
  { id: "late", label: "Geç / erken", valueKey: "late" },
  { id: "movements", label: "Hareketler", valueKey: "movements" },
  { id: "issues", label: "Kontrol", valueKey: "issues" },
];

export default async function PersonnelReportPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const ctx = await getReportContext(await props.searchParams);
  const data = await loadAttendanceDays({ companyId: ctx.companyId, employeeWhere: ctx.employeeWhere, fromKey: ctx.fromKey, toKey: ctx.toKey });
  const summaries = summarizeAttendanceDays(data.employees, data.rows, data.companyName)
    .filter((row) => ctx.employeeId || row.plannedDays || row.attendedDays || data.employees.find((item) => item.id === row.employeeId)?.isActive);
  const sum = totals(summaries);
  const ratio = attendanceRatio(data.rows);

  const summaryRows = summaries.map((row) => {
    const tone = row.missingDays || row.errorDays ? "danger" : row.lateDays ? "warning" : "success";
    return {
      id: row.employeeId,
      employee: row.employee,
      organization: `${row.registrationNumber} · ${row.department} · ${row.branch}`,
      days: `${row.plannedDays} / ${row.attendedDays} gün`,
      rate: `Devam ${formatPercent(Math.min(row.attendedDays, row.plannedDays), row.plannedDays)}`,
      worked: formatDuration(row.workedMinutes),
      workedHours: formatHours(row.workedMinutes),
      planned: `Plan ${formatDuration(row.plannedMinutes)}`,
      overtime: formatDuration(row.overtimeMinutes),
      overtimeHours: formatHours(row.overtimeMinutes),
      holiday: row.holidayWorkMinutes ? `Tatil ${formatDuration(row.holidayWorkMinutes)}` : null,
      missing: formatDuration(row.missingMinutes),
      missingHours: formatHours(row.missingMinutes),
      late: `${row.lateDays} gün geç · ${formatDuration(row.lateMinutes)}`,
      early: `Erken çıkış ${formatDuration(row.earlyLeaveMinutes)}`,
      leave: `${row.leaveDays} gün izin`,
      absent: `${row.missingDays} gün devamsız`,
      status: row.errorDays ? `${row.errorDays} gün kontrol` : row.missingDays ? "Devamsızlık var" : row.lateDays ? "Geç kalma var" : "Normal",
      tone,
    };
  });

  const selected = ctx.employeeId ? summaries.find((row) => row.employeeId === ctx.employeeId) : null;
  const dayRows = selected ? data.rows.filter((row) => row.employeeId === selected.employeeId).map((row) => ({
    id: row.date,
    date: formatDayLabel(row.date, { day: "2-digit", month: "long", year: "numeric" }),
    weekday: formatDayLabel(row.date, { weekday: "long" }),
    codeLabel: row.code ? PUANTAJ_DAY_CODE_LABELS[row.code] : "—",
    tone: row.code === "!" || row.code === "D" ? "danger" : row.code === "G" ? "warning" : row.code === "Ç" ? "success" : "neutral",
    times: `${row.firstEntry} – ${row.lastExit}`,
    plan: row.plannedStart !== "-" ? `Plan ${row.plannedStart} – ${row.plannedEnd}` : row.leaveType !== "-" ? row.leaveType : null,
    worked: formatDuration(row.workedMinutes),
    workedMinutes: row.workedMinutes,
    breakText: row.breakMinutes ? `Mola ${formatDuration(row.breakMinutes)}` : null,
    diff: row.overtimeMinutes ? `+${formatDuration(row.overtimeMinutes)}` : row.holidayWorkMinutes ? `Tatil +${formatDuration(row.holidayWorkMinutes)}` : row.missingMinutes ? `−${formatDuration(row.missingMinutes)}` : "—",
    late: row.lateMinutes || row.earlyLeaveMinutes ? `${row.lateMinutes} / ${row.earlyLeaveMinutes} dk` : "—",
    movements: row.movements || "—",
    issues: row.issues,
  })) : [];

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader kicker="Raporlar / Personel" title="Personel Puantaj Özeti" description="Seçilen tarih aralığında her personelin çalışma süresi, fazla mesai, eksik süre, izin ve devamsızlık durumu." />
      <ReportFilters ctx={ctx} showEmployee />

      <KpiGrid>
        <Kpi icon={<UserCheck size={18} />} label="Devam oranı" value={formatPercent(ratio.attended, ratio.planned)} hint={`${summaries.length} personel`} tone="success" />
        <Kpi icon={<Clock3 size={18} />} label="Net çalışma" value={`${formatHours(sum.workedMinutes)} sa`} hint={`Planlanan ${formatHours(sum.plannedMinutes)} sa`} tone="info" />
        <Kpi icon={<TimerReset size={18} />} label="Fazla mesai" value={`${formatHours(sum.overtimeMinutes)} sa`} hint={`Tatil çalışması ${formatHours(sum.holidayWorkMinutes)} sa`} tone="info" />
        <Kpi icon={<AlarmClock size={18} />} label="Eksik süre" value={`${formatHours(sum.missingMinutes)} sa`} hint={`${sum.absentDays} devamsız · ${sum.leaveDays} izinli gün`} tone="warning" />
      </KpiGrid>

      <Panel title="Personel özeti" description={`${formatDayLabel(ctx.fromKey, { day: "2-digit", month: "long" })} – ${formatDayLabel(ctx.toKey, { day: "2-digit", month: "long", year: "numeric" })}`} aside={<span className={ui.countBadge}>{summaryRows.length} personel</span>}>
        <ReorderableDataTable rows={summaryRows} columns={SUMMARY_COLUMNS} storageKey="reports.personnel.summary.columns" filename={`personel-puantaj-ozeti-${ctx.fromKey}-${ctx.toKey}`} emptyMessage="Seçilen filtrelerde personel bulunamadı." canExport={ctx.canExport} minWidth={1080} />
      </Panel>

      {selected ? (
        <Panel title={`${selected.employee} · günlük döküm`} description="Puantajdaki her günün kaynağı: hareketler, planlanan vardiya ve hesaplanan süreler." aside={<span className={ui.countBadge}>{dayRows.length} gün</span>}>
          <ReorderableDataTable rows={dayRows} columns={DAY_COLUMNS} storageKey="reports.personnel.days.columns" filename={`personel-gunluk-${selected.registrationNumber}-${ctx.fromKey}-${ctx.toKey}`} emptyMessage="Bu aralıkta kayıt yok." canExport={ctx.canExport} minWidth={1180} />
        </Panel>
      ) : <p className={ui.tableHint}>Bir personelin gün gün dökümü için filtreden personel seçin.</p>}
    </div>
  );
}
