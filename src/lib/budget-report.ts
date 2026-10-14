import { calculateGrossToNet, SALARY_MONTHS, type SalaryParameters } from "@/lib/salary-calculation";
import { salaryEngineType, WORKFORCE_TYPE_LABELS, type SalaryInsuranceTypeCode, type WorkforceTypeCode } from "@/lib/personnel-profile";

export type BudgetEmployee = {
  id: number;
  name: string;
  department: string;
  category: string | null;
  position: string | null;
  workforceType: WorkforceTypeCode | null;
  insuranceType: SalaryInsuranceTypeCode;
  grossSalary: number | null;
};

export type BudgetGroup = {
  key: string;
  label: string;
  headcount: number;
  monthlyGross: number;
  annualGross: number;
  annualNet: number;
  annualEmployerCost: number;
  share: number;
};

export type BudgetMonth = { month: number; label: string; gross: number; net: number; employerCost: number };

export type BudgetReport = {
  headcount: number;
  salariedHeadcount: number;
  missingSalaryCount: number;
  monthlyGross: number;
  annualGross: number;
  annualNet: number;
  annualEmployerCost: number;
  averageMonthlyEmployerCost: number;
  employerBurdenRate: number;
  months: BudgetMonth[];
  byDepartment: BudgetGroup[];
  byCategory: BudgetGroup[];
  byWorkforce: BudgetGroup[];
  byPosition: BudgetGroup[];
};

const UNASSIGNED = "Tanımsız";

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type Calculated = { employee: BudgetEmployee; monthlyGross: number; annualGross: number; annualNet: number; annualEmployerCost: number };

function group(rows: Calculated[], labelOf: (employee: BudgetEmployee) => string, totalCost: number): BudgetGroup[] {
  const map = new Map<string, BudgetGroup>();
  for (const row of rows) {
    const label = labelOf(row.employee);
    const current = map.get(label) ?? { key: label, label, headcount: 0, monthlyGross: 0, annualGross: 0, annualNet: 0, annualEmployerCost: 0, share: 0 };
    current.headcount += 1;
    current.monthlyGross += row.monthlyGross;
    current.annualGross += row.annualGross;
    current.annualNet += row.annualNet;
    current.annualEmployerCost += row.annualEmployerCost;
    map.set(label, current);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      monthlyGross: round(item.monthlyGross),
      annualGross: round(item.annualGross),
      annualNet: round(item.annualNet),
      annualEmployerCost: round(item.annualEmployerCost),
      share: totalCost > 0 ? item.annualEmployerCost / totalCost : 0,
    }))
    .sort((a, b) => b.annualEmployerCost - a.annualEmployerCost);
}

/**
 * Builds the yearly personnel budget from each employee's monthly gross salary.
 * `raiseRate` (e.g. 0.25 for %25) lets managers compare a raise scenario with the same rules.
 */
export function buildBudgetReport(employees: BudgetEmployee[], parameters: SalaryParameters, raiseRate = 0): BudgetReport {
  const months: BudgetMonth[] = SALARY_MONTHS.map((label, index) => ({ month: index + 1, label, gross: 0, net: 0, employerCost: 0 }));
  const calculated: Calculated[] = [];

  for (const employee of employees) {
    if (!employee.grossSalary || employee.grossSalary <= 0) continue;
    const monthlyGross = employee.grossSalary * (1 + raiseRate);
    const engineType = salaryEngineType(employee.insuranceType);
    const result = calculateGrossToNet(monthlyGross, engineType, parameters);
    const employerSocial = parameters.employerSocialSecurityRates[engineType] + parameters.employerUnemploymentRates[engineType];
    result.months.forEach((month, index) => {
      const base = Math.min(Math.max(month.rawGross, parameters.socialSecurityFloor), parameters.socialSecurityCeiling);
      months[index].gross += month.gross;
      months[index].net += month.net;
      months[index].employerCost += month.rawGross + base * employerSocial;
    });
    calculated.push({ employee, monthlyGross, annualGross: result.annualGross, annualNet: result.annualNet, annualEmployerCost: result.annualEmployerCost });
  }

  const annualEmployerCost = round(calculated.reduce((total, row) => total + row.annualEmployerCost, 0));
  const annualGross = round(calculated.reduce((total, row) => total + row.annualGross, 0));
  const salariedHeadcount = calculated.length;

  return {
    headcount: employees.length,
    salariedHeadcount,
    missingSalaryCount: employees.length - salariedHeadcount,
    monthlyGross: round(calculated.reduce((total, row) => total + row.monthlyGross, 0)),
    annualGross,
    annualNet: round(calculated.reduce((total, row) => total + row.annualNet, 0)),
    annualEmployerCost,
    averageMonthlyEmployerCost: salariedHeadcount ? round(annualEmployerCost / 12 / salariedHeadcount) : 0,
    employerBurdenRate: annualGross > 0 ? annualEmployerCost / annualGross - 1 : 0,
    months: months.map((month) => ({ ...month, gross: round(month.gross), net: round(month.net), employerCost: round(month.employerCost) })),
    byDepartment: group(calculated, (employee) => employee.department || UNASSIGNED, annualEmployerCost),
    byCategory: group(calculated, (employee) => employee.category || UNASSIGNED, annualEmployerCost),
    byWorkforce: group(calculated, (employee) => employee.workforceType ? WORKFORCE_TYPE_LABELS[employee.workforceType] : UNASSIGNED, annualEmployerCost),
    byPosition: group(calculated, (employee) => employee.position || UNASSIGNED, annualEmployerCost),
  };
}
