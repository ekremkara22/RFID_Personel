export type EmploymentInput = {
  isActive: boolean;
  hireDate?: Date | null;
  terminationDate?: Date | null;
};

export type EmploymentStatusResult = "ACTIVE" | "PASSIVE" | "BEFORE_HIRE" | "AFTER_TERMINATION";

export function startOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function isDateWithinRange(date: Date, from?: Date | null, to?: Date | null) {
  const target = startOfLocalDay(date).getTime();
  const fromTime = from ? startOfLocalDay(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? startOfLocalDay(to).getTime() : Number.POSITIVE_INFINITY;

  return target >= fromTime && target <= toTime;
}

export function resolveEmploymentStatus(employee: EmploymentInput, workDate: Date): EmploymentStatusResult {
  if (!employee.isActive) return "PASSIVE";
  if (employee.hireDate && startOfLocalDay(workDate) < startOfLocalDay(employee.hireDate)) return "BEFORE_HIRE";
  if (employee.terminationDate && startOfLocalDay(workDate) > startOfLocalDay(employee.terminationDate)) {
    return "AFTER_TERMINATION";
  }

  return "ACTIVE";
}

export function timeToMinutes(time?: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function calculateGrossMinutes(startTime?: string | null, endTime?: string | null, crossesMidnight = false) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null) return 0;

  const normalizedEnd = crossesMidnight && end <= start ? end + 1440 : end;
  return Math.max(normalizedEnd - start, 0);
}

export function calculateNetMinutes(
  startTime?: string | null,
  endTime?: string | null,
  breakMinutes = 0,
  crossesMidnight = false,
) {
  return Math.max(calculateGrossMinutes(startTime, endTime, crossesMidnight) - Math.max(breakMinutes, 0), 0);
}

export function formatMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(totalMinutes, 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes} dk`;
  if (minutes === 0) return `${hours} sa`;
  return `${hours} sa ${minutes} dk`;
}
