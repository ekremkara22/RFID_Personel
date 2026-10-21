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
    nodes: [{ hardwareId: "AA:BB:CC:DD:EE:FF", name: "Masa lambası", kind: "LIGHT", rssi: -54, state: { power: true }, lastSeenSecondsAgo: 12 }],
    acknowledgements: [{ id: 4, status: "COMPLETED" }],
  });
  assert.equal(payload.gateway.agentVersion, "1.0.0");
  assert.equal(payload.nodes[0].stateJson, '{"power":true}');
  assert.equal(payload.nodes[0].lastSeenSecondsAgo, 12);
  assert.deepEqual(payload.acknowledgements[0], { id: 4, status: "COMPLETED", error: null });
  assert.deepEqual(payload.rejected, []);
});

test("geçersiz düğüm ve onayları atlar, geçerli olanları korur", () => {
  const payload = parseSmartHomeSyncPayload({
    nodes: [{ hardwareId: "invalid id" }, { hardwareId: "node-1", rssi: 15 }, { hardwareId: "node-2", kind: "lamp" }, { hardwareId: "node-3" }],
    acknowledgements: [{ id: 0, status: "COMPLETED" }, { id: 7, status: "FAILED", error: "röle yanıt vermedi" }],
  });
  assert.deepEqual(payload.nodes.map((node) => node.hardwareId), ["node-3"]);
  assert.equal(payload.nodes[0].lastSeenSecondsAgo, 0);
  assert.deepEqual(payload.acknowledgements.map((ack) => ack.id), [7]);
  assert.equal(payload.rejected.length, 4);
  assert.match(payload.rejected[0], /hardwareId/);
});

test("gövde yapısı bozuksa tamamen reddeder", () => {
  assert.throws(() => parseSmartHomeSyncPayload({ nodes: Array.from({ length: 101 }, () => ({})) }), /en fazla 100/);
  assert.throws(() => parseSmartHomeSyncPayload([]), /nesne/);
});
