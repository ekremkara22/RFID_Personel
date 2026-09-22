import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAttendanceSequence, calculateBreakMinutes, EXIT_TOLERANCE_MINUTES, inferBidirectionalMovement } from "./attendance-sequence";

test("tek cihazdaki hareketleri girişten sonra mola çıkış/giriş olarak sırayla sınıflandırır", () => {
  assert.equal(EXIT_TOLERANCE_MINUTES, 10);
  assert.equal(inferBidirectionalMovement({ logs: [], isNearPlannedEnd: false }), "ENTRY");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }], isNearPlannedEnd: false }), "BREAK_START");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "BREAK_START" }], isNearPlannedEnd: false }), "BREAK_END");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "BREAK_START" }, { type: "BREAK_END" }], isNearPlannedEnd: false }), "BREAK_START");
});

test("mesai bitimine yakın basımı mevcut adımdan bağımsız çıkış sayar", () => {
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }], isNearPlannedEnd: true }), "EXIT");
});

test("geçici çıkıştan sonraki okutmayı engellemez", () => {
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "EXIT" }], isNearPlannedEnd: false }), "BREAK_START");
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
