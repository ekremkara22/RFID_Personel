import assert from "node:assert/strict";
import test from "node:test";
import { accountLink, buildPasswordResetEmail, buildVerificationEmail, generateEmailToken, hashEmailToken } from "./account-emails";

test("e-posta token'ı yalnız hash'i ile eşleşir ve her seferinde farklıdır", () => {
  const first = generateEmailToken();
  const second = generateEmailToken();
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashEmailToken(first.token));
  assert.match(first.tokenHash, /^[0-9a-f]{64}$/);
  assert.notEqual(first.tokenHash, first.token);
});

test("hesap bağlantısı uygulama adresi ve token ile kurulur", () => {
  assert.equal(accountLink("https://test.flodeska.com", "/verify-email", "abc_-1"), "https://test.flodeska.com/verify-email?token=abc_-1");
  assert.equal(accountLink("https://flodeska.com/", "/reset-password", "x"), "https://flodeska.com/reset-password?token=x");
});

test("doğrulama ve sıfırlama e-postaları bağlantıyı içerir, HTML metni kaçırılır", () => {
  const verification = buildVerificationEmail("<Ayşe>", "https://flodeska.com/verify-email?token=t1");
  assert.match(verification.subject, /doğrulayın/);
  assert.match(verification.text, /verify-email\?token=t1/);
  assert.match(verification.html, /&lt;Ayşe&gt;/);
  assert.doesNotMatch(verification.html, /<Ayşe>/);

  const reset = buildPasswordResetEmail("Ali", "https://flodeska.com/reset-password?token=t2&x=1");
  assert.match(reset.text, /reset-password\?token=t2/);
  assert.match(reset.html, /token=t2&amp;x=1/);
});
