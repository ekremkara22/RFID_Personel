import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { decryptSecret, encryptSecret, parseEncryptionKey, SecretKeyError, secretLast4 } from "./secret-box";

// Keys are generated per run; no secret value is stored in the repository.
const key = randomBytes(32);

test("round-trips a secret and binds it to its context", () => {
  const envelope = encryptSecret("sample-value-for-tests", key, "SHOPIER:API_TOKEN");
  assert.ok(!envelope.includes("sample-value-for-tests"));
  assert.equal(decryptSecret(envelope, key, "SHOPIER:API_TOKEN"), "sample-value-for-tests");
  assert.throws(() => decryptSecret(envelope, key, "SHOPIER:WEBHOOK:order.created"));
  assert.throws(() => decryptSecret(envelope, randomBytes(32), "SHOPIER:API_TOKEN"));
});

test("encryption uses a fresh IV each time", () => {
  assert.notEqual(encryptSecret("same", key, "ctx"), encryptSecret("same", key, "ctx"));
});

test("encryption key must be 32 bytes of base64", () => {
  assert.throws(() => parseEncryptionKey(undefined), SecretKeyError);
  assert.throws(() => parseEncryptionKey(""), SecretKeyError);
  assert.throws(() => parseEncryptionKey(randomBytes(16).toString("base64")), SecretKeyError);
  assert.equal(parseEncryptionKey(key.toString("base64")).length, 32);
});

test("masking reveals only the last four characters of long values", () => {
  assert.equal(secretLast4("abcdefghijklmnop"), "mnop");
  assert.equal(secretLast4("short"), null);
});
