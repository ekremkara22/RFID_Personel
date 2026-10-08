import assert from "node:assert/strict";
import test from "node:test";
import { getAppDayKey, getAppDayRange, getAppMinutes, parseAppDateTimeInput } from "./app-time";

test("İstanbul saatini sunucu saat diliminden bağımsız hesaplar", () => {
  const scan = new Date("2026-09-14T06:08:00.000Z");
  assert.equal(getAppDayKey(scan), "2026-09-14");
  assert.equal(getAppMinutes(scan), 9 * 60 + 8);
});

test("İstanbul iş günü sorgu aralığını UTC olarak üretir", () => {
  const range = getAppDayRange("2026-09-14");
  assert.equal(range.start.toISOString(), "2026-09-13T21:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-09-14T21:00:00.000Z");
  assert.equal(range.dateOnly.toISOString(), "2026-09-13T21:00:00.000Z");
});

test("İstanbul yerel tarih-saat filtresini UTC anına dönüştürür", () => {
  assert.equal(parseAppDateTimeInput("2026-10-08T00:01")?.toISOString(), "2026-10-07T21:01:00.000Z");
  assert.equal(parseAppDateTimeInput("2026-10-08T23:59", { endOfMinute: true })?.toISOString(), "2026-10-08T20:59:59.999Z");
});
