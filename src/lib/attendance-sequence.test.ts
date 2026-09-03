import assert from "node:assert/strict";
import test from "node:test";
import { calculateBreakMinutes, inferBidirectionalMovement } from "./attendance-sequence";

test("tek cihazdaki standart dört basımı sırayla sınıflandırır", () => {
  assert.equal(inferBidirectionalMovement({ logs: [], isNearPlannedEnd: false }), "ENTRY");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }], isNearPlannedEnd: false }), "BREAK_START");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "BREAK_START" }], isNearPlannedEnd: false }), "BREAK_END");
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }, { type: "BREAK_START" }, { type: "BREAK_END" }], isNearPlannedEnd: false }), "EXIT");
});

test("mesai bitimine yakın basımı mevcut adımdan bağımsız çıkış sayar", () => {
  assert.equal(inferBidirectionalMovement({ logs: [{ type: "ENTRY" }], isNearPlannedEnd: true }), "EXIT");
});

test("tamamlanan ve devam eden mola dakikalarını hesaplar", () => {
  const logs = [
    { type: "ENTRY" as const, scannedAt: new Date("2026-09-03T08:00:00") },
    { type: "BREAK_START" as const, scannedAt: new Date("2026-09-03T12:00:00") },
    { type: "BREAK_END" as const, scannedAt: new Date("2026-09-03T12:25:00") },
    { type: "BREAK_START" as const, scannedAt: new Date("2026-09-03T15:00:00") },
  ];
  assert.deepEqual(calculateBreakMinutes(logs, new Date("2026-09-03T15:10:00")), {
    totalMinutes: 35,
    isOnBreak: true,
  });
});
