import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteCompanyRole, companyRoleDeletionMessage } from "@/lib/company-role-policy";

test("kullanıcısı olmayan rol silinebilir", () => {
  assert.equal(canDeleteCompanyRole(0), true);
  assert.equal(companyRoleDeletionMessage(0), null);
});

test("aktiflik durumundan bağımsız olarak kullanıcısı olan rol silinemez", () => {
  assert.equal(canDeleteCompanyRole(1), false);
  assert.equal(companyRoleDeletionMessage(2), "Bu rol 2 kullanıcı tarafından kullanıldığı için silinemez.");
});
