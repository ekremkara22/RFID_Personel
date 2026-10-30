import { PayrollPeriodStatus } from "@/generated/prisma/client";
import type { AttendanceDayRow } from "@/lib/attendance-days";
import { buildPayrollSnapshot, getPayrollMonthRange, normalizePayrollMonth, parsePayrollSnapshot } from "@/lib/payroll-period";
import { queryRepository } from "@/modules/shared/query-repository";
import { listDayKeys, type ReportContext } from "../report-context";

export const PAYROLL_STATUS_LABELS: Record<PayrollPeriodStatus, string> = { OPEN: "Açık", APPROVED: "Onaylandı", LOCKED: "Kilitli" };

/** Ekran ve dışa aktarma için aynı puantaj görünümü: onaylı dönemde snapshot, açık dönemde canlı hesap. */
export async function getPayrollView(ctx: ReportContext, month?: string) {
  const monthKey = normalizePayrollMonth(month);
  const range = getPayrollMonthRange(monthKey);
  const period = await queryRepository.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId: ctx.companyId, year: range.year, month: range.month } },
    include: { approvedBy: true, lockedBy: true },
  });
  const frozenSnapshot = parsePayrollSnapshot(period?.snapshotJson);
  const snapshot = frozenSnapshot ?? await buildPayrollSnapshot(ctx.companyId, monthKey);
  // Kapsam, şube ve departman filtresi ctx.employees listesinde uygulanmıştır.
  const visibleIds = new Set(ctx.employees.map((employee) => employee.id));
  const summaryRows = snapshot.summaryRows.filter((row) => visibleIds.has(row.employeeId));
  const detailRows = snapshot.detailRows.filter((row) => visibleIds.has(row.employeeId));
  const daysByEmployee = new Map<number, Map<string, AttendanceDayRow>>();
  for (const row of detailRows) {
    const days = daysByEmployee.get(row.employeeId) ?? new Map<string, AttendanceDayRow>();
    days.set(row.date, row);
    daysByEmployee.set(row.employeeId, days);
  }
  const lastDayKey = listDayKeys(`${monthKey}-01`, `${monthKey}-31`).filter((key) => key.startsWith(monthKey)).at(-1)!;
  return {
    monthKey,
    period,
    status: period?.status ?? PayrollPeriodStatus.OPEN,
    isFrozen: Boolean(frozenSnapshot),
    snapshot,
    summaryRows,
    detailRows,
    daysByEmployee,
    dayKeys: listDayKeys(`${monthKey}-01`, lastDayKey),
  };
}

export type PayrollView = Awaited<ReturnType<typeof getPayrollView>>;

const WEEKDAY_SHORT = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];

function weekdayIndex(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekend(dayKey: string) {
  const weekday = weekdayIndex(dayKey);
  return weekday === 0 || weekday === 6;
}

/** Puantaj kodlarıyla karışmasın diye iki harfli gün kısaltması. */
export function weekdayShort(dayKey: string) {
  return WEEKDAY_SHORT[weekdayIndex(dayKey)];
}

export function dayTitle(row: AttendanceDayRow | undefined, dayKey: string) {
  if (!row) return `${dayKey}: kayıt yok`;
  const parts = [dayKey];
  if (row.firstEntry !== "-" || row.lastExit !== "-") parts.push(`Giriş ${row.firstEntry} · Çıkış ${row.lastExit}`);
  if (row.workedMinutes) parts.push(`Net ${Math.floor(row.workedMinutes / 60)} sa ${row.workedMinutes % 60} dk`);
  if (row.lateMinutes) parts.push(`Geç ${row.lateMinutes} dk`);
  if (row.overtimeMinutes) parts.push(`Fazla mesai ${row.overtimeMinutes} dk`);
  if (row.leaveType !== "-") parts.push(row.leaveType);
  if (row.issues !== "Normal") parts.push(row.issues);
  return parts.join("\n");
}
