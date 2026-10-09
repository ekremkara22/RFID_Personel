import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinalizedMovementTypes,
  DEFAULT_ATTENDANCE_FINALIZATION_DELAY_MINUTES,
  getScheduledShiftBounds,
} from "./attendance-finalization-rules";

function movement(id: number, type: "ENTRY" | "EXIT" | "BREAK_START" | "BREAK_END", hour: number, minute = 0) {
  return {
    id,
    type,
    scannedAt: new Date(Date.UTC(2026, 9, 8, hour - 3, minute)),
    deviceId: 1,
    rfidCardId: "CARD-1",
  };
}

test("varsayilan kesinlestirme zamani vardiya bitiminden iki saat sonradir", () => {
  assert.equal(DEFAULT_ATTENDANCE_FINALIZATION_DELAY_MINUTES, 120);
  const bounds = getScheduledShiftBounds({
    workDate: new Date("2026-10-07T21:00:00.000Z"),
    plannedStart: "08:45",
    plannedEnd: "18:30",
    crossesMidnight: false,
  });
  assert.equal(bounds?.shiftEnd.toISOString(), "2026-10-08T15:30:00.000Z");
  assert.equal(bounds?.dueAt.toISOString(), "2026-10-08T17:30:00.000Z");
});

test("gece vardiyasinin bitisi ertesi gune tasinir", () => {
  const bounds = getScheduledShiftBounds({
    workDate: new Date("2026-10-07T21:00:00.000Z"),
    plannedStart: "22:00",
    plannedEnd: "06:00",
    crossesMidnight: true,
  });
  assert.equal(bounds?.shiftStart.toISOString(), "2026-10-08T19:00:00.000Z");
  assert.equal(bounds?.shiftEnd.toISOString(), "2026-10-09T03:00:00.000Z");
  assert.equal(bounds?.dueAt.toISOString(), "2026-10-09T05:00:00.000Z");
});

test("cift sayidaki hareketlerde ilk giris son cikis ve ortadakiler mola olur", () => {
  const result = buildFinalizedMovementTypes([
    movement(1, "ENTRY", 8, 40),
    movement(2, "BREAK_START", 12),
    movement(3, "BREAK_END", 12, 30),
    movement(4, "BREAK_START", 16),
  ]);
  assert.equal(result.status, "FINALIZED");
  assert.deepEqual(result.decisions, [
    { id: 1, type: "ENTRY" },
    { id: 2, type: "BREAK_START" },
    { id: 3, type: "BREAK_END" },
    { id: 4, type: "EXIT" },
  ]);
});

test("tek veya tek sayidaki hareket otomatik tahmin edilmez", () => {
  assert.equal(buildFinalizedMovementTypes([movement(1, "ENTRY", 8)]).status, "REVIEW");
  assert.equal(buildFinalizedMovementTypes([
    movement(1, "ENTRY", 8),
    movement(2, "BREAK_START", 12),
    movement(3, "BREAK_END", 12, 30),
  ]).status, "REVIEW");
});

test("on saniye icindeki yinelenen okutma incelemeye gider", () => {
  const first = movement(1, "ENTRY", 8);
  const duplicate = { ...movement(2, "BREAK_START", 8), scannedAt: new Date(first.scannedAt.getTime() + 5_000) };
  const result = buildFinalizedMovementTypes([first, duplicate]);
  assert.equal(result.status, "REVIEW");
  assert.deepEqual(result.duplicateIds, [2]);
});
