import { type AttendanceTrackingMode, type BreakDeductionMode, PayrollPeriodStatus } from "@/generated/prisma/client";
import { type AttendanceDayRow, type AttendanceSummaryRow, loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import { dateOnlyFromKey, getAppDayKey, getDateOnlyKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";

export const PAYROLL_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type PayrollDetailRow = AttendanceDayRow;
export type PayrollSummaryRow = AttendanceSummaryRow;

export type PayrollSnapshot = {
  version: 2;
  trackingMode: AttendanceTrackingMode | null;
  breakDeductionMode: BreakDeductionMode | null;
  monthKey: string;
  generatedAt: string;
  summaryRows: PayrollSummaryRow[];
  detailRows: PayrollDetailRow[];
};

export function getDefaultPayrollMonth(now = new Date()) {
  return getAppDayKey(now).slice(0, 7);
}

export function normalizePayrollMonth(value?: string) {
  const currentMonth = getDefaultPayrollMonth();
  return value && PAYROLL_MONTH_PATTERN.test(value) && value <= currentMonth ? value : currentMonth;
}

export function getPayrollMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    year,
    month,
    start: dateOnlyFromKey(`${monthKey}-01`),
    end: dateOnlyFromKey(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`),
  };
}

export async function buildPayrollSnapshot(companyId: number, monthKey: string): Promise<PayrollSnapshot> {
  const lastDay = new Date(getPayrollMonthRange(monthKey).end.getTime() - 24 * 60 * 60_000);
  const data = await loadAttendanceDays({ companyId, employeeWhere: {}, fromKey: `${monthKey}-01`, toKey: getDateOnlyKey(lastDay) });
  return {
    version: 2,
    trackingMode: data.trackingMode,
    breakDeductionMode: data.breakDeductionMode,
    monthKey,
    generatedAt: new Date().toISOString(),
    summaryRows: summarizeAttendanceDays(data.employees, data.rows, data.companyName),
    detailRows: data.rows,
  };
}

export function parsePayrollSnapshot(value?: string | null): PayrollSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Omit<PayrollSnapshot, "version"> & { version: number };
    if (!Array.isArray(parsed.summaryRows) || !Array.isArray(parsed.detailRows)) return null;
    if (parsed.version !== 1 && parsed.version !== 2) return null;
    // Onaylanmış eski dönemler değişmez; eski snapshot'ta olmayan alanlar sıfır gösterilir.
    return {
      ...parsed,
      version: 2,
      trackingMode: parsed.trackingMode ?? null,
      breakDeductionMode: parsed.breakDeductionMode ?? null,
      summaryRows: parsed.summaryRows.map((row) => ({
        ...row,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
        actualBreakMinutes: row.actualBreakMinutes ?? row.breakMinutes,
        excessBreakMinutes: row.excessBreakMinutes ?? 0,
        plannedMinutes: row.plannedMinutes ?? 0,
        overtimeMinutes: row.overtimeMinutes ?? 0,
        holidayWorkMinutes: row.holidayWorkMinutes ?? 0,
        missingMinutes: row.missingMinutes ?? 0,
        leaveDays: row.leaveDays ?? 0,
        codeCounts: row.codeCounts ?? {},
      })),
      detailRows: parsed.detailRows.map((row) => ({
        ...row,
        code: row.code ?? "",
        leaveType: row.leaveType ?? "-",
        plannedMinutes: row.plannedMinutes ?? 0,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
        actualBreakMinutes: row.actualBreakMinutes ?? row.breakMinutes,
        excessBreakMinutes: row.excessBreakMinutes ?? 0,
        overtimeMinutes: row.overtimeMinutes ?? 0,
        holidayWorkMinutes: row.holidayWorkMinutes ?? 0,
        missingMinutes: row.missingMinutes ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

export async function assertPayrollPeriodUnlocked(companyId: number, date: Date) {
  const [year, month] = getAppDayKey(date).slice(0, 7).split("-").map(Number);
  const locked = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
    select: { status: true },
  });
  if (locked?.status === PayrollPeriodStatus.LOCKED) {
    throw new Error(`${year}-${String(month).padStart(2, "0")} puantaj dönemi kilitli.`);
  }
}
