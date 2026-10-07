export type OperationReportPeriod = "daily" | "weekly" | "monthly";

export function shiftDayKey(dayKey: string, days: number) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveOperationReportRange(dayKey: string, period: OperationReportPeriod) {
  if (period === "daily") return { startKey: dayKey, endExclusiveKey: shiftDayKey(dayKey, 1) };
  if (period === "weekly") {
    const date = new Date(`${dayKey}T00:00:00Z`);
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const startKey = shiftDayKey(dayKey, -mondayOffset);
    return { startKey, endExclusiveKey: shiftDayKey(startKey, 7) };
  }
  const startKey = `${dayKey.slice(0, 8)}01`;
  const nextMonth = new Date(`${startKey}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { startKey, endExclusiveKey: nextMonth.toISOString().slice(0, 10) };
}
