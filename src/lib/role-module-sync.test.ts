import assert from "node:assert/strict";
import test from "node:test";
import { membershipModuleRows } from "@/lib/role-module-sync";

test("rol modüllerini role bağlı tüm üyeliklere aynen uygular", () => {
  assert.deepEqual(membershipModuleRows([7, 9], ["HR"]), [
    { membershipId: 7, moduleKey: "HR" },
    { membershipId: 9, moduleKey: "HR" },
  ]);
});

test("kaldırılan modülü üyelik satırlarına taşımaz", () => {
  const rows = membershipModuleRows([4], ["HR"]);

  assert.equal(rows.some((row) => row.moduleKey === "PRODUCTION_PLANNING"), false);
});
