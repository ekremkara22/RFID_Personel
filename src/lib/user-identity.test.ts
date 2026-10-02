import assert from "node:assert/strict";
import test from "node:test";
import { isValidOptionalUsername, normalizeOptionalUsername } from "@/lib/user-identity";

test("eski e-posta kullanıcılarında boş kullanıcı adını kabul eder", () => {
  const username = normalizeOptionalUsername("   ");

  assert.equal(username, null);
  assert.equal(isValidOptionalUsername(username), true);
});

test("dolu kullanıcı adını normalize edip kurala göre doğrular", () => {
  assert.equal(normalizeOptionalUsername("  SEMIH.ARI  "), "semih.ari");
  assert.equal(isValidOptionalUsername("semih.ari"), true);
  assert.equal(isValidOptionalUsername("geçersiz kullanıcı"), false);
});
