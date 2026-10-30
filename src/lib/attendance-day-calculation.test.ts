import assert from "node:assert/strict";
import test from "node:test";
import { calculateAttendanceDay, type DayCalendarInput, type DayLogInput } from "./attendance-day-calculation";

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 8, hour - 3, minute));

function calendar(overrides: Partial<DayCalendarInput> = {}): DayCalendarInput {
  return {
    workDate: new Date("2026-10-07T21:00:00.000Z"),
    dayType: "NORMAL_WORK",
    employmentStatus: "ACTIVE",
    plannedStart: "08:00",
    plannedEnd: "18:00",
    plannedBreakStart: "12:00",
    plannedBreakEnd: "13:00",
    plannedBreakMinutes: 60,
    plannedNetMinutes: 540,
    crossesMidnight: false,
    checkLateArrival: true,
    checkEarlyDeparture: true,
    checkAbsence: true,
    ...overrides,
  };
}

function log(id: number, type: DayLogInput["type"], hour: number, minute = 0): DayLogInput {
  return { id, type, scannedAt: at(hour, minute) };
}

const past = { isPast: true, isToday: false };

test("sadece giris-cikis modunda takvimdeki mola dusulur, ara okutma sayilmaz", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar(),
    leave: null,
    logs: [log(1, "ENTRY", 8), log(2, "INTERMEDIATE", 12, 10), log(3, "EXIT", 18)],
    ...past,
  });
  assert.equal(result.code, "Ç");
  assert.equal(result.breakMinutes, 60);
  assert.equal(result.workedMinutes, 540);
  assert.equal(result.overtimeMinutes, 0);
  assert.deepEqual(result.issues, []);
});

test("mola penceresinden once cikan personelden mola dusulmez", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar(),
    leave: null,
    logs: [log(1, "ENTRY", 8), log(2, "EXIT", 11)],
    ...past,
  });
  assert.equal(result.breakMinutes, 0);
  assert.equal(result.workedMinutes, 180);
  assert.equal(result.missingMinutes, 360);
  assert.equal(result.earlyLeaveMinutes, 420);
});

test("mola takipli modda gercek mola dusulur, fazla mesai planlanan net sureyi asan dakikadir", () => {
  const result = calculateAttendanceDay({
    trackingMode: "BREAK_TRACKING",
    calendar: calendar(),
    leave: null,
    logs: [log(1, "ENTRY", 8, 10), log(2, "BREAK_START", 12), log(3, "BREAK_END", 12, 30), log(4, "EXIT", 19, 10)],
    ...past,
  });
  assert.equal(result.code, "G");
  assert.equal(result.lateMinutes, 10);
  assert.equal(result.breakMinutes, 30);
  assert.equal(result.workedMinutes, 630);
  assert.equal(result.overtimeMinutes, 90);
});

test("hafta tatilinde calisma ayri sayilir", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar({ dayType: "WEEKLY_REST", plannedNetMinutes: 0, plannedBreakMinutes: 0, plannedStart: null, plannedEnd: null }),
    leave: null,
    logs: [log(1, "ENTRY", 9), log(2, "EXIT", 13)],
    ...past,
  });
  assert.equal(result.holidayWorkMinutes, 240);
  assert.equal(result.overtimeMinutes, 0);
});

test("hareketsiz gun izin, tatil veya devamsizlik koduna donusur", () => {
  const base = { trackingMode: "ENTRY_EXIT_ONLY" as const, logs: [], ...past };
  assert.equal(calculateAttendanceDay({ ...base, calendar: calendar({ dayType: "LEAVE" }), leave: { type: "ANNUAL", durationType: "FULL_DAY", startTime: null, endTime: null } }).code, "Y");
  assert.equal(calculateAttendanceDay({ ...base, calendar: calendar({ dayType: "OFFICIAL_HOLIDAY" }), leave: null }).code, "RT");
  assert.equal(calculateAttendanceDay({ ...base, calendar: calendar({ dayType: "WEEKLY_REST" }), leave: null }).code, "HT");
  const absent = calculateAttendanceDay({ ...base, calendar: calendar(), leave: null });
  assert.equal(absent.code, "D");
  assert.equal(absent.missingMinutes, 540);
  assert.equal(calculateAttendanceDay({ ...base, calendar: calendar(), leave: null, isPast: false }).code, "");
});

test("cikisi olmayan gecmis gun kontrol gerektirir", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar(),
    leave: null,
    logs: [log(1, "ENTRY", 8)],
    ...past,
  });
  assert.equal(result.code, "!");
  assert.deepEqual(result.issues, ["Eksik çıkış"]);
  assert.equal(result.workedMinutes, 0);
});

test("yarim gun izinde izin gunu sayilmaz, izinli sure beklenen calismadan dusulur", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar(),
    leave: { type: "ANNUAL", durationType: "HALF_DAY", startTime: "13:00", endTime: "18:00" },
    logs: [log(1, "ENTRY", 8, 20), log(2, "EXIT", 13)],
    ...past,
  });
  assert.equal(result.code, "Ç");
  assert.equal(result.plannedMinutes, 240);
  assert.equal(result.workedMinutes, 220);
  assert.equal(result.missingMinutes, 20);
  assert.equal(result.lateMinutes, 0);
  assert.equal(result.earlyLeaveMinutes, 0);
});

test("saatlik izinli personel hic gelmezse devamsiz sayilir", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar(),
    leave: { type: "EXCUSE", durationType: "HOURLY", startTime: "08:00", endTime: "10:00" },
    logs: [],
    ...past,
  });
  assert.equal(result.code, "D");
  assert.equal(result.missingMinutes, 420);
});

test("sadece giris-cikis modunda kesinlestirilmemis gunde son okutma cikis sayilir", () => {
  const result = calculateAttendanceDay({
    trackingMode: "ENTRY_EXIT_ONLY",
    calendar: calendar({ dayType: "WEEKLY_REST", plannedNetMinutes: 0, plannedBreakMinutes: 0, plannedStart: null, plannedEnd: null }),
    leave: null,
    logs: [log(1, "ENTRY", 9), log(2, "INTERMEDIATE", 11), log(3, "INTERMEDIATE", 14)],
    ...past,
  });
  assert.equal(result.code, "Ç");
  assert.equal(result.holidayWorkMinutes, 300);
  assert.deepEqual(result.issues, []);
});

test("cikis giristen once ise erken cikis uretilmez", () => {
  const result = calculateAttendanceDay({
    trackingMode: "BREAK_TRACKING",
    calendar: calendar({ plannedStart: "22:00", plannedEnd: "06:00", crossesMidnight: true }),
    leave: null,
    logs: [log(1, "EXIT", 6), log(2, "ENTRY", 22)],
    ...past,
  });
  assert.equal(result.earlyLeaveMinutes, 0);
});
