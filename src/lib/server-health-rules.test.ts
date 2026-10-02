import assert from "node:assert/strict";
import test from "node:test";
import { latencyHealthLevel, overallHealthLevel, usageHealthLevel } from "./server-health-rules";

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
