import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAttendanceSequence, calculateBreakMinutes, inferBidirectionalMovement } from "./attendance-sequence";

test("tek cihazdaki hareketleri girişten sonra mola başlangıç/bitiş olarak sırayla sınıflandırır", () => {
  assert.equal(inferBidirectionalMovement({ logs: [] }), "ENTRY");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }] }), "BREAK_START");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "BREAK_START" }] }), "BREAK_END");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "BREAK_START" }, { type: "BREAK_END" }] }), "BREAK_START");
});

test("geçici çıkıştan sonraki okutmayı engellemez", () => {
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "EXIT" }] }), "BREAK_START");
});

test("yalnızca kesin eşleşen mola çiftlerini toplar", () => {
  const logs = [
    { id: 1, type: "ENTRY" as const, scannedAt: new Date("2026-09-03T08:00:00") },
    { id: 2, type: "BREAK_START" as const, scannedAt: new Date("2026-09-03T10:00:00") },
    { id: 3, type: "BREAK_END" as const, scannedAt: new Date("2026-09-03T10:15:00") },
    { id: 4, type: "BREAK_END" as const, scannedAt: new Date("2026-09-03T12:30:00") },
    { id: 5, type: "EXIT" as const, scannedAt: new Date("2026-09-03T18:00:00") },
  ];
  assert.deepEqual(analyzeAttendanceSequence(logs, { requireExit: true }), {
    totalMinutes: 15,
    isOnBreak: false,
    isValid: false,
    unmatchedLogIds: [4],
  });
  assert.deepEqual(calculateBreakMinutes(logs), { totalMinutes: 15, isOnBreak: false });
});

test("açık mola için varsayımsal süre üretmez", () => {
  const logs = [
    { id: 1, type: "ENTRY" as const, scannedAt: new Date("2026-09-03T08:30:00") },
    { id: 2, type: "BREAK_START" as const, scannedAt: new Date("2026-09-03T12:00:00") },
    { id: 3, type: "EXIT" as const, scannedAt: new Date("2026-09-03T18:00:00") },
  ];

  assert.deepEqual(analyzeAttendanceSequence(logs, { requireExit: true }), {
    totalMinutes: 0,
    isOnBreak: true,
    isValid: false,
    unmatchedLogIds: [2],
  });
});

test("sadece giris-cikis modunda girişten sonraki okutmalar ara okutmadır ve mola sayılmaz", () => {
  assert.equal(inferBidirectionalMovement({ logs: [], trackingMode: "ENTRY_EXIT_ONLY" }), "ENTRY");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }], trackingMode: "ENTRY_EXIT_ONLY" }), "INTERMEDIATE");
  const day = (hour: number) => new Date(Date.UTC(2026, 9, 8, hour - 3));
  const analysis = analyzeAttendanceSequence([
    { id: 1, type: "ENTRY", scannedAt: day(8) },
    { id: 2, type: "INTERMEDIATE", scannedAt: day(12) },
    { id: 3, type: "EXIT", scannedAt: day(18) },
  ], { requireExit: true });
  assert.equal(analysis.isValid, true);
  assert.equal(analysis.totalMinutes, 0);
});
