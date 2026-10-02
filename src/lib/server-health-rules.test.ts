import assert from "node:assert/strict";
import test from "node:test";
import {
  bandwidthHealthLevel,
  calculateMbps,
  latencyHealthLevel,
  overallHealthLevel,
  usageHealthLevel,
} from "./server-health-rules";

test("kaynak kullanım eşiklerini sınıflandırır", () => {
  assert.equal(usageHealthLevel(79.9), "healthy");
  assert.equal(usageHealthLevel(80), "warning");
  assert.equal(usageHealthLevel(90), "critical");
  assert.equal(usageHealthLevel(null), "unknown");
});

test("veritabanı gecikmesini sınıflandırır", () => {
  assert.equal(latencyHealthLevel(45), "healthy");
  assert.equal(latencyHealthLevel(250), "warning");
  assert.equal(latencyHealthLevel(500), "critical");
  assert.equal(latencyHealthLevel(null), "critical");
});

test("genel durumda en önemli uyarıyı korur", () => {
  assert.equal(overallHealthLevel(["healthy", "warning"]), "warning");
  assert.equal(overallHealthLevel(["warning", "critical"]), "critical");
  assert.equal(overallHealthLevel(["unknown", "unknown"]), "unknown");
});

test("aktarılan bayt ve süreyi Mbps değerine dönüştürür", () => {
  assert.equal(calculateMbps(5_000_000, 1_000), 40);
  assert.equal(calculateMbps(1_000_000, 2_000), 4);
  assert.equal(calculateMbps(0, 1_000), null);
});

test("internet hız eşiklerini sınıflandırır", () => {
  assert.equal(bandwidthHealthLevel(25, 10, 2), "healthy");
  assert.equal(bandwidthHealthLevel(5, 10, 2), "warning");
  assert.equal(bandwidthHealthLevel(1, 10, 2), "critical");
  assert.equal(bandwidthHealthLevel(null, 10, 2), "critical");
});
