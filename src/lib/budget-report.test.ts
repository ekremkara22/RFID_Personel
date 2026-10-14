import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBudgetReport, type BudgetEmployee } from "./budget-report";
import { calculateGrossToNet, DEFAULT_2026_SALARY_PARAMETERS } from "./salary-calculation";

const employees: BudgetEmployee[] = [
  { id: 1, name: "A", department: "Üretim", category: "Operasyon", position: "Operatör", workforceType: "BLUE_COLLAR", insuranceType: "INCENTIVE", grossSalary: 40_000 },
  { id: 2, name: "B", department: "Üretim", category: "Operasyon", position: "Operatör", workforceType: "BLUE_COLLAR", insuranceType: "INCENTIVE", grossSalary: 40_000 },
  { id: 3, name: "C", department: "Muhasebe", category: "İdari", position: "Uzman", workforceType: "WHITE_COLLAR", insuranceType: "NO_INCENTIVE", grossSalary: 90_000 },
  { id: 4, name: "D", department: "Depo", category: null, position: null, workforceType: null, insuranceType: "INCENTIVE", grossSalary: null },
];

test("bütçe toplamları maaş hesaplama motoruyla aynı sonucu verir", () => {
  const report = buildBudgetReport(employees, DEFAULT_2026_SALARY_PARAMETERS);
  const expected = calculateGrossToNet(40_000, "incentive").annualEmployerCost * 2 + calculateGrossToNet(90_000, "no-incentive").annualEmployerCost;
  assert.equal(report.headcount, 4);
  assert.equal(report.salariedHeadcount, 3);
  assert.equal(report.missingSalaryCount, 1);
  assert.equal(report.monthlyGross, 170_000);
  assert.ok(Math.abs(report.annualEmployerCost - expected) < 0.05);
  const monthTotal = report.months.reduce((total, month) => total + month.employerCost, 0);
  assert.ok(Math.abs(monthTotal - report.annualEmployerCost) < 1);
});

test("bütçe departman, kategori ve yaka tipine göre gruplanır", () => {
  const report = buildBudgetReport(employees, DEFAULT_2026_SALARY_PARAMETERS);
  // Sorted by employer cost: one 90k no-incentive salary costs more than two 40k incentive salaries.
  assert.deepEqual(report.byDepartment.map((item) => [item.label, item.headcount]), [["Muhasebe", 1], ["Üretim", 2]]);
  assert.ok(report.byDepartment[0].annualEmployerCost > report.byDepartment[1].annualEmployerCost);
  assert.deepEqual(report.byWorkforce.map((item) => item.label).sort(), ["Beyaz yaka", "Mavi yaka"]);
  assert.ok(Math.abs(report.byCategory.reduce((total, item) => total + item.share, 0) - 1) < 1e-9);
});

test("zam senaryosu maliyeti artırır", () => {
  const base = buildBudgetReport(employees, DEFAULT_2026_SALARY_PARAMETERS);
  const raised = buildBudgetReport(employees, DEFAULT_2026_SALARY_PARAMETERS, 0.25);
  assert.equal(raised.monthlyGross, 212_500);
  assert.ok(raised.annualEmployerCost > base.annualEmployerCost);
});
