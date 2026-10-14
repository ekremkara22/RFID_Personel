import type { SalaryEmployeeType } from "@/lib/salary-calculation";

export const SALARY_INSURANCE_TYPES = ["INCENTIVE", "NO_INCENTIVE", "RETIRED"] as const;
export type SalaryInsuranceTypeCode = (typeof SALARY_INSURANCE_TYPES)[number];

export const SALARY_INSURANCE_TYPE_LABELS: Record<SalaryInsuranceTypeCode, string> = {
  INCENTIVE: "5510 Teşvikli",
  NO_INCENTIVE: "Teşviksiz",
  RETIRED: "Emekli",
};

/** Maps the stored SGK type to the salary engine's employer-rate key. */
export function salaryEngineType(type: SalaryInsuranceTypeCode): SalaryEmployeeType {
  return type === "RETIRED" ? "retired" : type === "NO_INCENTIVE" ? "no-incentive" : "incentive";
}

function normalizeWord(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

export function parseSalaryInsuranceType(value: string): SalaryInsuranceTypeCode | undefined {
  const normalized = normalizeWord(value);
  if (!normalized || ["5510 teşvikli", "teşvikli", "tesvikli", "5510", "incentive"].includes(normalized)) return "INCENTIVE";
  if (["teşviksiz", "tesviksiz", "no-incentive", "no_incentive"].includes(normalized)) return "NO_INCENTIVE";
  if (["emekli", "retired"].includes(normalized)) return "RETIRED";
  return undefined;
}

/**
 * Accepts Turkish ("45.000,50") and plain ("45000.50") amounts as typed in spreadsheets.
 * Returns null for empty input and undefined when the value is not a valid positive amount.
 */
export function parseMoney(value: string | number): number | null | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : undefined;
  const cleaned = value.replace(/[₺\s]|TL/gi, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  return amount > 0 && amount < 10_000_000_000 ? amount : undefined;
}

/** Accepts GG.AA.YYYY, GG/AA/YYYY and YYYY-AA-GG; returns a UTC midnight date like the date inputs do. */
export function parseImportDate(value: string): Date | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let year: number;
  let month: number;
  let day: number;
  const turkish = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (turkish) [day, month, year] = [Number(turkish[1]), Number(turkish[2]), Number(turkish[3])];
  else if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : undefined;
}

/** Whether a Muhasebe personnel salary is entered as monthly gross or monthly net. */
export const SALARY_BASES = ["GROSS", "NET"] as const;
export type SalaryBasisCode = (typeof SALARY_BASES)[number];

export const SALARY_BASIS_LABELS: Record<SalaryBasisCode, string> = {
  GROSS: "Brüt",
  NET: "Net",
};

export function parseSalaryBasis(value: string): SalaryBasisCode | undefined {
  const normalized = normalizeWord(value);
  if (!normalized) return undefined;
  if (["brüt", "brut", "brüt maaş", "brut maas", "gross"].includes(normalized)) return "GROSS";
  if (["net", "net maaş", "net maas"].includes(normalized)) return "NET";
  return undefined;
}
