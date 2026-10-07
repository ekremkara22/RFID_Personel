import assert from "node:assert/strict";
import test from "node:test";
import { resolveOperationReportRange, shiftDayKey } from "./operation-report-range";

test("günlük operasyon raporu yalnız seçili günü kapsar", () => {
  assert.deepEqual(resolveOperationReportRange("2026-10-07", "daily"), {
    startKey: "2026-10-07",
    endExclusiveKey: "2026-10-08",
  });
});

test("haftalık operasyon raporu pazartesi-pazar aralığını kapsar", () => {
  assert.deepEqual(resolveOperationReportRange("2026-10-07", "weekly"), {
    startKey: "2026-10-05",
    endExclusiveKey: "2026-10-12",
  });
});

test("aylık operasyon raporu ay sınırlarını doğru hesaplar", () => {
  assert.deepEqual(resolveOperationReportRange("2026-12-18", "monthly"), {
    startKey: "2026-12-01",
    endExclusiveKey: "2027-01-01",
  });
  assert.equal(shiftDayKey("2026-12-31", 1), "2027-01-01");
});
