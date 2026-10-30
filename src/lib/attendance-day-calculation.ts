import type { AttendanceTrackingMode, AttendanceType, BreakDeductionMode, EmploymentStatus, LeaveDurationType, LeaveType, WorkDayType } from "@/generated/prisma/client";
import { getAppDayRange, getDateOnlyKey } from "@/lib/app-time";
import { getScheduledShiftBounds } from "@/lib/attendance-finalization-rules";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";
import { timeToMinutes } from "@/lib/work-calendar-rules";

/** Aylık puantaj cetvelinde bir günü özetleyen kısa kod. Boş: henüz değerlendirilecek bir şey yok. */
export type PuantajDayCode = "Ç" | "G" | "Y" | "R" | "Üİ" | "İ" | "HT" | "RT" | "D" | "!" | "";

export const PUANTAJ_DAY_CODE_LABELS: Record<Exclude<PuantajDayCode, "">, string> = {
  "Ç": "Çalıştı",
  "G": "Geç geldi",
  "Y": "Yıllık izin",
  "R": "Rapor",
  "Üİ": "Ücretsiz izin",
  "İ": "Diğer izin",
  "HT": "Hafta tatili",
  "RT": "Resmi / firma tatili",
  "D": "Devamsız",
  "!": "Kontrol gerekli",
};

const LEAVE_CODES: Record<LeaveType, PuantajDayCode> = {
  ANNUAL: "Y",
  MEDICAL: "R",
  UNPAID: "Üİ",
  EXCUSE: "İ",
  ADMINISTRATIVE: "İ",
  HOURLY: "İ",
  HALF_DAY: "İ",
};

const REST_DAY_TYPES = new Set<WorkDayType>(["WEEKLY_REST", "NON_WORKING"]);
const HOLIDAY_DAY_TYPES = new Set<WorkDayType>(["OFFICIAL_HOLIDAY", "COMPANY_HOLIDAY"]);
const DELAYED_UPLOAD_THRESHOLD_MS = 5 * 60_000;

export type DayCalendarInput = {
  workDate: Date;
  dayType: WorkDayType;
  employmentStatus: EmploymentStatus;
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedBreakStart: string | null;
  plannedBreakEnd: string | null;
  plannedBreakMinutes: number;
  plannedNetMinutes: number;
  crossesMidnight: boolean;
  checkLateArrival: boolean;
  checkEarlyDeparture: boolean;
  checkAbsence: boolean;
};

export type DayLeaveInput = {
  type: LeaveType;
  durationType: LeaveDurationType;
  startTime: string | null;
  endTime: string | null;
};

export type DayLogInput = { id: number; type: AttendanceType; scannedAt: Date; receivedAt?: Date | null };

export type AttendanceDayResult = {
  code: PuantajDayCode;
  entry: Date | null;
  exit: Date | null;
  plannedMinutes: number;
  workedMinutes: number;
  /** Puantajdan düşülen mola. */
  breakMinutes: number;
  /** Mola takibi açıkken okutmalardan ölçülen mola. */
  actualBreakMinutes: number;
  /** Ölçülen molanın planlanan molayı aşan kısmı. */
  excessBreakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  holidayWorkMinutes: number;
  missingMinutes: number;
  issues: string[];
};

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}

/** Planlanan mola penceresi; gece vardiyasında vardiya başlangıcından önceki saat ertesi güne aittir. */
function getPlannedBreakWindow(calendar: DayCalendarInput) {
  const start = timeToMinutes(calendar.plannedBreakStart);
  const end = timeToMinutes(calendar.plannedBreakEnd);
  const shiftStart = timeToMinutes(calendar.plannedStart);
  if (start === null || end === null) return null;
  const dayStart = getAppDayRange(getDateOnlyKey(calendar.workDate)).start.getTime();
  const shift = (minutes: number) =>
    calendar.crossesMidnight && shiftStart !== null && minutes < shiftStart ? 24 * 60 : 0;
  const windowStart = new Date(dayStart + (start + shift(start)) * 60_000);
  let windowEnd = new Date(dayStart + (end + shift(end)) * 60_000);
  if (windowEnd <= windowStart) windowEnd = new Date(windowEnd.getTime() + 24 * 60 * 60_000);
  return { start: windowStart, end: windowEnd };
}

/** Takvimdeki mola; personelin işyerinde olduğu süreyle planlanan mola penceresinin kesiştiği kadar. */
function getPlannedBreakMinutes(params: {
  calendar: DayCalendarInput | null;
  entry: Date;
  exit: Date;
}) {
  const planned = params.calendar?.plannedBreakMinutes ?? 0;
  if (!params.calendar || planned <= 0) return 0;
  const gross = minutesBetween(params.entry, params.exit);
  const window = getPlannedBreakWindow(params.calendar);
  if (!window) return Math.min(planned, gross);
  const overlapStart = params.entry > window.start ? params.entry : window.start;
  const overlapEnd = params.exit < window.end ? params.exit : window.end;
  return Math.min(planned, minutesBetween(overlapStart, overlapEnd));
}

/** Kısmi (saatlik/yarım gün) iznin planlanan süreden düşülecek dakikası. */
function getPartialLeaveMinutes(leave: DayLeaveInput, plannedMinutes: number) {
  const start = timeToMinutes(leave.startTime);
  const end = timeToMinutes(leave.endTime);
  if (start !== null && end !== null && end > start) return Math.min(plannedMinutes, end - start);
  return leave.durationType === "HALF_DAY" ? Math.floor(plannedMinutes / 2) : 0;
}

/** Bir personelin bir gününü puantaj değerlerine çevirir. Aylık puantaj bu hesabı kullanır. */
export function calculateAttendanceDay(params: {
  /** BREAK_TRACKING: mola takibi açık, ENTRY_EXIT_ONLY: kapalı. */
  trackingMode: AttendanceTrackingMode;
  /** Mola takibi açıkken planlanan molayı aşan sürenin de düşülüp düşülmeyeceği. */
  breakDeductionMode: BreakDeductionMode;
  calendar: DayCalendarInput | null;
  leave: DayLeaveInput | null;
  logs: DayLogInput[];
  isPast: boolean;
  isToday: boolean;
}): AttendanceDayResult {
  const { calendar, trackingMode } = params;
  const logs = [...params.logs].sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime() || first.id - second.id);
  const scheduledMinutes = calendar?.employmentStatus === "ACTIVE" ? Math.max(0, calendar.plannedNetMinutes) : 0;
  const fullDayLeave = params.leave?.durationType === "FULL_DAY" ? params.leave : null;
  // Kısmi izin günü izin günü sayılmaz; izinli süre beklenen çalışmadan düşülür.
  const partialLeaveMinutes = params.leave && !fullDayLeave ? getPartialLeaveMinutes(params.leave, scheduledMinutes) : 0;
  const plannedMinutes = scheduledMinutes - partialLeaveMinutes;
  const isHoliday = Boolean(calendar && HOLIDAY_DAY_TYPES.has(calendar.dayType));
  const isRestDay = Boolean(calendar && (REST_DAY_TYPES.has(calendar.dayType) || isHoliday));
  const result: AttendanceDayResult = {
    code: "",
    entry: null,
    exit: null,
    plannedMinutes,
    workedMinutes: 0,
    breakMinutes: 0,
    actualBreakMinutes: 0,
    excessBreakMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    holidayWorkMinutes: 0,
    missingMinutes: 0,
    issues: [],
  };

  if (logs.length === 0) {
    if (fullDayLeave) result.code = LEAVE_CODES[fullDayLeave.type];
    else if (isHoliday) result.code = "RT";
    else if (isRestDay) result.code = "HT";
    else if (calendar?.checkAbsence && plannedMinutes > 0 && params.isPast) {
      result.code = "D";
      result.missingMinutes = plannedMinutes;
      result.issues.push("Hareket yok");
    }
    return result;
  }

  // Mola ölçülmeyen modda ara okutmalar ve eski mola kayıtları hesaba katılmaz.
  const sequenceLogs = trackingMode === "ENTRY_EXIT_ONLY"
    ? logs.filter((log) => log.type === "ENTRY" || log.type === "EXIT")
    : logs;
  const entry = logs.find((log) => log.type === "ENTRY")?.scannedAt ?? null;
  // Sadece giriş-çıkış modunda son okutma çıkıştır; kesinleştirilmemiş (ör. tatil) günlerde de geçerlidir.
  const lastScan = logs.length > 1 && params.isPast && trackingMode === "ENTRY_EXIT_ONLY" ? logs.at(-1)!.scannedAt : null;
  const exit = [...logs].reverse().find((log) => log.type === "EXIT")?.scannedAt ?? lastScan;
  const analysis = analyzeAttendanceSequence(sequenceLogs, {
    requireExit: params.isPast && !lastScan,
    allowOpenBreak: params.isToday,
  });
  result.entry = entry;
  result.exit = exit;

  // Kısmi izinli günde geç gelme / erken çıkma izinle açıklanır, ayrıca sayılmaz.
  const bounds = calendar && !params.leave ? getScheduledShiftBounds(calendar) : null;
  if (entry && bounds && calendar?.checkLateArrival && plannedMinutes > 0) {
    result.lateMinutes = minutesBetween(bounds.shiftStart, entry);
  }
  if (entry && exit && exit > entry && bounds && calendar?.checkEarlyDeparture && plannedMinutes > 0) {
    result.earlyLeaveMinutes = minutesBetween(exit, bounds.shiftEnd);
  }

  if (entry && exit && exit > entry) {
    // Planlanan mola her durumda düşülür; ölçülen mola fazlası yalnız seçildiyse düşülür.
    const plannedBreak = getPlannedBreakMinutes({ calendar, entry, exit });
    if (trackingMode === "BREAK_TRACKING") {
      result.actualBreakMinutes = analysis.totalMinutes;
      result.excessBreakMinutes = Math.max(0, analysis.totalMinutes - (calendar?.plannedBreakMinutes ?? 0));
    }
    result.breakMinutes = plannedBreak + (params.breakDeductionMode === "PLANNED_AND_EXCESS" ? result.excessBreakMinutes : 0);
    result.workedMinutes = Math.max(0, minutesBetween(entry, exit) - result.breakMinutes);
    if (isRestDay) result.holidayWorkMinutes = result.workedMinutes;
    else if (plannedMinutes > 0) {
      result.overtimeMinutes = Math.max(0, result.workedMinutes - plannedMinutes);
      result.missingMinutes = Math.max(0, plannedMinutes - result.workedMinutes);
    }
  }

  const missingExit = params.isPast && !exit;
  if (missingExit) result.issues.push("Eksik çıkış");
  else if (!analysis.isValid) result.issues.push("Eşleşmeyen hareket");
  if (logs.some((log) => log.receivedAt && log.receivedAt.getTime() - log.scannedAt.getTime() > DELAYED_UPLOAD_THRESHOLD_MS)) {
    result.issues.push("Gecikmeli aktarım");
  }

  const needsControl = missingExit || !analysis.isValid;
  result.code = needsControl && params.isPast ? "!" : result.lateMinutes > 0 ? "G" : "Ç";
  return result;
}
