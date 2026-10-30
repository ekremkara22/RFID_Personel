import { CalendarOff, Coffee, LogIn, Timer, UserX, Users } from "lucide-react";
import type { AttendanceType } from "@/generated/prisma/client";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { PUANTAJ_DAY_CODE_LABELS } from "@/lib/attendance-day-calculation";
import { loadAttendanceDays } from "@/lib/attendance-days";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import { formatDayLabel, getReportContext, type ReportSearchParams } from "../report-context";
import { formatDuration, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";

const TYPE_BY_LABEL = new Map(Object.entries(ATTENDANCE_TYPE_LABELS).map(([type, label]) => [label, type as AttendanceType]));
const LEAVE_CODES = new Set(["Y", "R", "Üİ", "İ"]);

function lastMovementType(movements: string) {
  const last = movements.split(" | ").at(-1);
  return last ? TYPE_BY_LABEL.get(last.slice(6)) ?? null : null;
}

export default async function DailyAttendanceReportPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const params = await props.searchParams;
  const ctx = await getReportContext({ ...params, from: params.to }, { defaultFrom: "today" });
  const dayKey = ctx.toKey;
  const isToday = dayKey === ctx.todayKey;
  const data = await loadAttendanceDays({ companyId: ctx.companyId, employeeWhere: ctx.employeeWhere, fromKey: dayKey, toKey: dayKey });
  const breakTracking = data.trackingMode === "BREAK_TRACKING";
  const rowByEmployee = new Map(data.rows.map((row) => [row.employeeId, row]));
  const employees = data.employees.filter((employee) => employee.isActive || rowByEmployee.has(employee.id));

  const entries = employees.map((employee) => {
    const row = rowByEmployee.get(employee.id);
    const last = row ? lastMovementType(row.movements) : null;
    const present = Boolean(row && row.firstEntry !== "-");
    const planned = Boolean(row && row.plannedMinutes > 0);
    const onLeave = Boolean(row && LEAVE_CODES.has(row.code));
    let status = "Kayıt yok";
    let tone = "neutral";
    if (isToday && present && last === "EXIT") status = "Çıkış yaptı";
    else if (isToday && present && (last === "BREAK_START" || last === "MEAL_START")) { status = "Molada"; tone = "warning"; }
    // Mola takibi kapalıyken gün içi son okutmanın çıkış olup olmadığı gün kesinleşince belli olur.
    else if (isToday && present) { status = breakTracking ? "İş yerinde" : "Giriş yaptı"; tone = "success"; }
    else if (row?.code) { status = PUANTAJ_DAY_CODE_LABELS[row.code]; tone = row.code === "!" || row.code === "D" ? "danger" : row.code === "G" ? "warning" : row.code === "Ç" ? "success" : "neutral"; }
    else if (planned && !present) { status = isToday ? "Henüz gelmedi" : "Gelmedi"; tone = "warning"; }
    const flags = { present, planned, onLeave, late: Boolean(row?.lateMinutes), onBreak: status === "Molada", inside: status === "İş yerinde" || status === "Molada" };
    return { flags, row: {
      id: employee.id,
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      organization: `${employee.registrationNumber ?? "-"} · ${employee.department || "Departmansız"} · ${employee.branch ?? "-"}`,
      plan: row && row.plannedStart !== "-" ? `${row.plannedStart} – ${row.plannedEnd}` : row?.leaveType !== undefined && row.leaveType !== "-" ? row.leaveType : "Plan yok",
      entry: row?.firstEntry ?? "-",
      late: row?.lateMinutes ? `${row.lateMinutes} dk geç` : present ? "Zamanında" : null,
      exit: row?.lastExit ?? "-",
      early: row?.earlyLeaveMinutes ? `${row.earlyLeaveMinutes} dk erken` : null,
      worked: row?.workedMinutes ? formatDuration(row.workedMinutes) : "—",
      workedMinutes: row?.workedMinutes ?? 0,
      deducted: row?.breakMinutes ? `Düşülen mola ${formatDuration(row.breakMinutes)}` : null,
      breakActual: row ? formatDuration(row.actualBreakMinutes) : "—",
      breakExcess: row?.excessBreakMinutes ? `${formatDuration(row.excessBreakMinutes)} aşım` : null,
      movements: row?.movements.replaceAll(" | ", " · ") || "Hareket yok",
      movementCount: row?.movementCount ?? 0,
      status,
      tone,
    } };
  });

  const columns: DataTableColumn[] = [
    { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "organization", kind: "person" },
    { id: "status", label: "Durum", valueKey: "status", toneKey: "tone", kind: "status" },
    { id: "entry", label: "Giriş", valueKey: "entry", secondaryKey: "late" },
    { id: "exit", label: "Çıkış", valueKey: "exit", secondaryKey: "early" },
    { id: "plan", label: "Planlanan", valueKey: "plan" },
    { id: "worked", label: "Net çalışma", valueKey: "worked", exportValueKey: "workedMinutes", secondaryKey: "deducted" },
    ...(breakTracking ? [{ id: "break", label: "Ölçülen mola", valueKey: "breakActual", secondaryKey: "breakExcess" }] : []),
    { id: "movements", label: "Hareketler", valueKey: "movements" },
  ];
  const count = (pick: (flags: (typeof entries)[number]["flags"]) => boolean) => entries.filter((entry) => pick(entry.flags)).length;

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader kicker="Raporlar / Günlük" title="Günlük Devam" description={`${formatDayLabel(dayKey, { day: "2-digit", month: "long", year: "numeric", weekday: "long" })} · Kim geldi, kim gelmedi; giriş, çıkış${breakTracking ? ", mola" : ""} ve net çalışma süresi.`} />
      <ReportFilters ctx={ctx} dateMode="day" />

      <KpiGrid>
        <Kpi icon={<Users size={18} />} label="Planlı personel" value={count((flags) => flags.planned && !flags.onLeave)} tone="info" />
        <Kpi icon={<LogIn size={18} />} label="Gelen" value={count((flags) => flags.present)} hint={isToday ? `${count((flags) => flags.inside)} kişi şu an içeride` : undefined} tone="success" />
        <Kpi icon={<Timer size={18} />} label="Geç kalan" value={count((flags) => flags.late)} tone="warning" />
        <Kpi icon={<UserX size={18} />} label={isToday ? "Henüz gelmeyen" : "Gelmeyen"} value={count((flags) => flags.planned && !flags.onLeave && !flags.present)} tone="danger" />
        <Kpi icon={<CalendarOff size={18} />} label="İzinli" value={count((flags) => flags.onLeave)} />
        {breakTracking && isToday ? <Kpi icon={<Coffee size={18} />} label="Şu an molada" value={count((flags) => flags.onBreak)} tone="warning" /> : null}
      </KpiGrid>

      <Panel title="Personel durumları" description={data.trackingMode === "ENTRY_EXIT_ONLY" ? "Mola takibi kapalı: ilk okutma giriş, son okutma çıkış sayılır; takvimdeki mola net süreden düşülür." : "Mola takibi açık: ara okutmalar mola başlangıç ve bitişi sayılır."} aside={<span className={ui.countBadge}>{entries.length} personel</span>}>
        <ReorderableDataTable rows={entries.map((entry) => entry.row)} columns={columns} storageKey={`reports.daily.columns.${breakTracking ? "break" : "simple"}`} filename={`gunluk-devam-${dayKey}`} emptyMessage="Seçilen filtrelerde personel bulunamadı." canExport={ctx.canExport} minWidth={1100} />
      </Panel>
    </div>
  );
}
