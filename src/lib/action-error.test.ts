import { test } from "node:test";
import assert from "node:assert/strict";
import { ActionError, actionErrorMessage } from "./action-error";

test("beklenen doğrulama hatası kullanıcıya açıkça aktarılır", () => {
  assert.equal(actionErrorMessage(new ActionError("Bu e-posta zaten kullanılıyor.")), "Bu e-posta zaten kullanılıyor.");
});

test("veritabanı ve beklenmeyen hata ayrıntıları kullanıcıya sızmaz", () => {
  assert.equal(actionErrorMessage(new Error("mysql://secret-password@private-host")), null);
  for (const code of ["P2002", "P2003", "P2025", "P2028", "P2021", "P2022", "P1001", "P1002", "P2024"]) {
    const message = actionErrorMessage({ code, message: "private SQL and credentials" });
    assert.ok(message);
    assert.ok(!message.includes("private"));
  }
});
