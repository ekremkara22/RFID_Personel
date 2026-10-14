import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBudgetReport, type BudgetEntry } from "./budget-report";
import { calculateGrossToNet, calculateNetToGross, DEFAULT_2026_SALARY_PARAMETERS } from "./salary-calculation";

const entries: BudgetEntry[] = [
  { key: "1", name: "A", department: "Üretim", category: "Operasyon", position: "Operatör", workforceType: "BLUE_COLLAR", insuranceType: "INCENTIVE", mode: "gross-to-net", amount: 40_000 },
  { key: "2", name: "B", department: "Üretim", category: "Operasyon", position: "Operatör", workforceType: "BLUE_COLLAR", insuranceType: "INCENTIVE", mode: "gross-to-net", amount: 40_000 },
  { key: "3", name: "C", department: "Muhasebe", category: "İdari", position: "Uzman", workforceType: "WHITE_COLLAR", insuranceType: "NO_INCENTIVE", mode: "net-to-gross", amount: 60_000 },
  { key: "4", name: "D", department: null, category: null, position: null, workforceType: null, insuranceType: "INCENTIVE", mode: "gross-to-net", amount: 0 },
];

test("bütçe toplamları her iki hesaplama listesinde motorla aynı sonucu verir", () => {
  const report = buildBudgetReport(entries, DEFAULT_2026_SALARY_PARAMETERS);
  const expected = calculateGrossToNet(40_000, "incentive").annualEmployerCost * 2 + calculateNetToGross(60_000, "no-incentive").annualEmployerCost;
  assert.equal(report.headcount, 3);
  assert.ok(Math.abs(report.annualEmployerCost - expected) < 0.05);
  const monthTotal = report.months.reduce((total, month) => total + month.employerCost, 0);
  assert.ok(Math.abs(monthTotal - report.annualEmployerCost) < 0.05);
  assert.ok(Math.abs(report.months[11].cumulativeEmployerCost - report.annualEmployerCost) < 0.05);
  assert.ok(report.netShare > 0 && report.netShare < 1);
});

test("bütçe departman, kategori, yaka ve SGK tipine göre gruplanır", () => {
  const report = buildBudgetReport(entries, DEFAULT_2026_SALARY_PARAMETERS);
  assert.deepEqual(report.byDepartment.map((item) => item.label).sort(), ["Muhasebe", "Üretim"]);
  assert.deepEqual(report.byWorkforce.map((item) => item.label).sort(), ["Beyaz yaka", "Mavi yaka"]);
  assert.deepEqual(report.byInsurance.map((item) => item.label).sort(), ["5510 Teşvikli", "Teşviksiz"]);
  assert.ok(Math.abs(report.byCategory.reduce((total, item) => total + item.share, 0) - 1) < 1e-9);
  assert.equal(report.people[0].name, "C");
});

test("zam senaryosu maliyeti artırır", () => {
  const base = buildBudgetReport(entries, DEFAULT_2026_SALARY_PARAMETERS);
  const raised = buildBudgetReport(entries, DEFAULT_2026_SALARY_PARAMETERS, 0.25);
  assert.ok(raised.annualEmployerCost > base.annualEmployerCost);
  assert.ok(Math.abs(raised.months[0].gross - base.months[0].gross * 1.25) > 0);
});
