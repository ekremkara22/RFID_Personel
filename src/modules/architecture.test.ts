import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { NAVIGATION_REGISTRY, navigationItems } from "@/modules/navigation-registry";
import { ALL_MODULE_KEYS, MODULE_REGISTRY } from "@/modules/registry";

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const target = join(directory, entry);
    return statSync(target).isDirectory() ? filesUnder(target) : [target];
  });
}

test("module registry keys and navigation routes are unique", () => {
  assert.equal(new Set(ALL_MODULE_KEYS).size, MODULE_REGISTRY.length);
  assert.equal(new Set(NAVIGATION_REGISTRY.map((item) => item.href)).size, NAVIGATION_REGISTRY.length);
  for (const item of NAVIGATION_REGISTRY) {
    if (item.module) assert.ok(ALL_MODULE_KEYS.includes(item.module), `${item.href} has an unknown module`);
  }
});

test("platform admin sees every registered product module without a license selection", () => {
  const context = { isPlatformAdmin: true, companyId: null, permissions: [], modules: [] };
  const visibleRoutes = (["hr-main", "hr-calendar", "hr-reports", "production"] as const)
    .flatMap((group) => navigationItems(group, context))
    .map((item) => item.href);

  assert.ok(context.isPlatformAdmin);
  assert.ok(visibleRoutes.includes("/dashboard/employees"));
  assert.ok(visibleRoutes.includes("/dashboard/production/work-centers"));
});

test("app pages access data through the module repository boundary", () => {
  const appRoot = join(process.cwd(), "src", "app");
  const violations = filesUnder(appRoot)
    .filter((file) => /[\\/](page|layout)\.tsx$/.test(file))
    .filter((file) => readFileSync(file, "utf8").includes('@/lib/prisma'));

  assert.deepEqual(violations, []);
});
