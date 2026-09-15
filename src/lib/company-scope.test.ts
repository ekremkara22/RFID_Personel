import assert from "node:assert/strict";
import test from "node:test";
import { scopedCompanyFilter } from "./company-scope";

test("an unassigned account matches no company's records", () => {
  assert.deepEqual(scopedCompanyFilter([]), { companyId: { in: [] } });
});

test("a multi-company account includes only its permitted companies", () => {
  const filter = scopedCompanyFilter([12, 34]);
  const records = [{ companyId: 12 }, { companyId: 34 }, { companyId: 56 }];
  assert.deepEqual(records.filter((record) => filter.companyId?.in.includes(record.companyId)), records.slice(0, 2));
});

test("only the explicit superadmin scope removes the company restriction", () => {
  assert.deepEqual(scopedCompanyFilter(null), {});
  assert.deepEqual(scopedCompanyFilter([12]), { companyId: { in: [12] } });
});
