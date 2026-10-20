import assert from "node:assert/strict";
import test from "node:test";

import { generateSmartHomeApiKey, hashSmartHomeApiKey, parseSmartHomeSyncPayload } from "./smart-home";

test("gateway anahtarı ham değer saklanmadan doğrulanabilir", () => {
  const key = generateSmartHomeApiKey();
  assert.match(key, /^shg_[A-Za-z0-9_-]{43}$/);
  assert.equal(hashSmartHomeApiKey(key).length, 64);
  assert.notEqual(hashSmartHomeApiKey(key), key);
});

test("senkronizasyon gövdesini normalize eder", () => {
  const payload = parseSmartHomeSyncPayload({
    gateway: { agentVersion: " 1.0.0 " },
    nodes: [{ hardwareId: "AA:BB:CC:DD:EE:FF", name: "Masa lambası", kind: "LIGHT", rssi: -54, state: { power: true } }],
    acknowledgements: [{ id: 4, status: "COMPLETED" }],
  });
  assert.equal(payload.gateway.agentVersion, "1.0.0");
  assert.equal(payload.nodes[0].stateJson, '{"power":true}');
  assert.deepEqual(payload.acknowledgements[0], { id: 4, status: "COMPLETED", error: null });
});

test("geçersiz veya aşırı düğüm telemetrisini reddeder", () => {
  assert.throws(() => parseSmartHomeSyncPayload({ nodes: [{ hardwareId: "invalid id" }] }), /hardwareId/);
  assert.throws(() => parseSmartHomeSyncPayload({ nodes: Array.from({ length: 101 }, () => ({})) }), /en fazla 100/);
  assert.throws(() => parseSmartHomeSyncPayload({ nodes: [{ hardwareId: "node-1", rssi: 15 }] }), /rssi/);
});
