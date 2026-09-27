import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClientEventId, resolveDeviceScanTime } from "./device-scan";

const now = new Date("2026-09-26T09:00:00.000Z");

test("eski firmware icin sunucu zamani kullanilir", () => {
  assert.deepEqual(resolveDeviceScanTime(undefined, now), {
    ok: true,
    scannedAt: now,
    source: "server",
  });
});

test("kuyruktaki cihaz okutma zamani korunur", () => {
  const result = resolveDeviceScanTime("2026-09-26T08:15:30.000Z", now);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.scannedAt.toISOString(), "2026-09-26T08:15:30.000Z");
});

test("ileri ve gecersiz derecede eski cihaz saatleri reddedilir", () => {
  assert.equal(resolveDeviceScanTime("2026-09-26T09:06:00.000Z", now).ok, false);
  assert.equal(resolveDeviceScanTime("2023-12-31T20:59:59.000Z", now).ok, false);
});

test("istemci olay kimligi guvenli karakter ve uzunlukla sinirlanir", () => {
  assert.equal(normalizeClientEventId("94B97EF345B4:1727340000:ABC12345"), "94B97EF345B4:1727340000:ABC12345");
  assert.equal(normalizeClientEventId("kisa"), "");
  assert.equal(normalizeClientEventId("gecersiz olay!"), "");
});
