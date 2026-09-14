export const APP_TIME_ZONE = "Europe/Istanbul";

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getParts(date: Date) {
  const values = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function getAppDayKey(date: Date) {
  const parts = getParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getDateOnlyKey(date: Date) {
  return getAppDayKey(date);
}

export function getAppMinutes(date: Date) {
  const parts = getParts(date);
  return parts.hour * 60 + parts.minute;
}

export function dateOnlyFromKey(dayKey: string) {
  const [year, month, date] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, -3, 0, 0, 0));
}

export function getAppDayRange(day: Date | string) {
  const dayKey = typeof day === "string" ? day : getAppDayKey(day);
  // Türkiye 2016'dan beri yıl boyunca UTC+3 kullanıyor.
  const start = dateOnlyFromKey(dayKey);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dayKey, start, end, dateOnly: start };
}
