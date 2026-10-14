import { calculateGrossToNet, calculateNetToGross, SALARY_MONTHS, type SalaryParameters } from "@/lib/salary-calculation";
import { SALARY_INSURANCE_TYPE_LABELS, salaryEngineType, type SalaryInsuranceTypeCode } from "@/lib/personnel-profile";

export type BudgetMode = "gross-to-net" | "net-to-gross";

/** One row of a salary sheet: a monthly gross (gross-to-net) or target net (net-to-gross) amount. */
export type BudgetEntry = {
  key: string;
  name: string;
  department: string | null;
  position: string | null;
  collarType: string | null;
  insuranceType: SalaryInsuranceTypeCode;
  mode: BudgetMode;
  amount: number;
};

export type BudgetGroup = {
  key: string;
  label: string;
  headcount: number;
  annualGross: number;
  annualNet: number;
  annualEmployerCost: number;
  share: number;
};

export type BudgetMonth = { month: number; label: string; gross: number; net: number; employerCost: number; cumulativeEmployerCost: number };

export type BudgetPerson = { key: string; name: string; department: string | null; position: string | null; annualGross: number; annualNet: number; annualEmployerCost: number };

export type BudgetReport = {
  headcount: number;
  annualGross: number;
  annualNet: number;
  annualEmployerCost: number;
  /** Employer premiums on top of gross pay, e.g. 0.19 for %19. */
  employerBurdenRate: number;
  /** Share of employer cost that reaches employees as net pay. */
  netShare: number;
  averageMonthlyEmployerCost: number;
  months: BudgetMonth[];
  people: BudgetPerson[];
  byDepartment: BudgetGroup[];
  byPosition: BudgetGroup[];
  byCollar: BudgetGroup[];
  byInsurance: BudgetGroup[];
};

export const UNASSIGNED_LABEL = "Tanımsız";

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function group(people: (BudgetPerson & { entry: BudgetEntry })[], labelOf: (entry: BudgetEntry) => string | null, totalCost: number): BudgetGroup[] {
  const map = new Map<string, BudgetGroup>();
  for (const person of people) {
    const label = labelOf(person.entry) || UNASSIGNED_LABEL;
    const current = map.get(label) ?? { key: label, label, headcount: 0, annualGross: 0, annualNet: 0, annualEmployerCost: 0, share: 0 };
    current.headcount += 1;
    current.annualGross += person.annualGross;
    current.annualNet += person.annualNet;
    current.annualEmployerCost += person.annualEmployerCost;
    map.set(label, current);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      annualGross: round(item.annualGross),
      annualNet: round(item.annualNet),
      annualEmployerCost: round(item.annualEmployerCost),
      share: totalCost > 0 ? item.annualEmployerCost / totalCost : 0,
    }))
    .sort((a, b) => b.annualEmployerCost - a.annualEmployerCost);
}

/**
 * Builds the yearly personnel budget from salary sheet rows with the same engine as Maaş Hesaplama.
 * `raiseRate` (0.25 = %25) scales every entered amount to compare a raise scenario.
 */
export function buildBudgetReport(entries: BudgetEntry[], parameters: SalaryParameters, raiseRate = 0): BudgetReport {
  const months = SALARY_MONTHS.map((label, index) => ({ month: index + 1, label, gross: 0, net: 0, employerCost: 0, cumulativeEmployerCost: 0 }));
  const people: (BudgetPerson & { entry: BudgetEntry })[] = [];

  for (const entry of entries) {
    if (!Number.isFinite(entry.amount) || entry.amount <= 0) continue;
    const amount = entry.amount * (1 + raiseRate);
    const engineType = salaryEngineType(entry.insuranceType);
    const result = entry.mode === "gross-to-net"
      ? calculateGrossToNet(amount, engineType, parameters)
      : calculateNetToGross(amount, engineType, parameters);
    result.months.forEach((month, index) => {
      const base = Math.min(Math.max(month.rawGross, parameters.socialSecurityFloor), parameters.socialSecurityCeiling);
      months[index].gross += month.gross;
      months[index].net += month.net;
      months[index].employerCost += month.rawGross
        + round(base * parameters.employerSocialSecurityRates[engineType])
        + round(base * parameters.employerUnemploymentRates[engineType]);
    });
    people.push({
      entry,
      key: entry.key,
      name: entry.name,
      department: entry.department,
      position: entry.position,
      annualGross: result.annualGross,
      annualNet: result.annualNet,
      annualEmployerCost: result.annualEmployerCost,
    });
  }

  const annualEmployerCost = round(people.reduce((total, person) => total + person.annualEmployerCost, 0));
  const annualGross = round(people.reduce((total, person) => total + person.annualGross, 0));
  const annualNet = round(people.reduce((total, person) => total + person.annualNet, 0));
  let cumulative = 0;

  return {
    headcount: people.length,
    annualGross,
    annualNet,
    annualEmployerCost,
    employerBurdenRate: annualGross > 0 ? annualEmployerCost / annualGross - 1 : 0,
    netShare: annualEmployerCost > 0 ? annualNet / annualEmployerCost : 0,
    averageMonthlyEmployerCost: people.length ? round(annualEmployerCost / 12 / people.length) : 0,
    months: months.map((month) => {
      cumulative += month.employerCost;
      return { ...month, gross: round(month.gross), net: round(month.net), employerCost: round(month.employerCost), cumulativeEmployerCost: round(cumulative) };
    }),
    people: people
      .map((person) => ({ key: person.key, name: person.name, department: person.department, position: person.position, annualGross: person.annualGross, annualNet: person.annualNet, annualEmployerCost: person.annualEmployerCost }))
      .sort((a, b) => b.annualEmployerCost - a.annualEmployerCost),
    byDepartment: group(people, (entry) => entry.department, annualEmployerCost),
    byPosition: group(people, (entry) => entry.position, annualEmployerCost),
    byCollar: group(people, (entry) => entry.collarType, annualEmployerCost),
    byInsurance: group(people, (entry) => SALARY_INSURANCE_TYPE_LABELS[entry.insuranceType], annualEmployerCost),
  };
}
