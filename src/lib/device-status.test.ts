import assert from "node:assert/strict";
import test from "node:test";
import { isDeviceOnline } from "./device-status";

test("device presence expires after three missed 30-second heartbeats", () => {
  const now = Date.UTC(2026, 8, 22, 12);
  assert.equal(isDeviceOnline(new Date(now - 30_000), now), true);
  assert.equal(isDeviceOnline(new Date(now - 90_000), now), true);
  assert.equal(isDeviceOnline(new Date(now - 90_001), now), false);
  assert.equal(isDeviceOnline(new Date(now - 86400_000), now), false);
});

test("unseen or invalid timestamps cannot indicate an online device", () => {
  const now = Date.now();
  assert.equal(isDeviceOnline(null, now), false);
  assert.equal(isDeviceOnline(new Date(NaN), now), false);
  assert.equal(isDeviceOnline(new Date(now + 1), now), false);
});
