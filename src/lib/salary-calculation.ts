export const SALARY_PARAMETERS_STORAGE_KEY = "rfid-personel.salary-parameters.v1";

export const SALARY_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

export type SalaryEmployeeType = "incentive" | "no-incentive" | "retired";

export const SALARY_EMPLOYEE_TYPE_LABELS: Record<SalaryEmployeeType, string> = {
  incentive: "5510 Teşvikli",
  "no-incentive": "Teşviksiz",
  retired: "Emekli",
};

export type SalaryTaxBracket = {
  lower: number;
  upper: number;
  rate: number;
};

export type SalaryMonthlyExemption = {
  month: number;
  incomeTax: number;
  stampTax: number;
};

export type SalaryParameters = {
  year: number;
  validFrom: string;
  validTo: string;
  taxBrackets: SalaryTaxBracket[];
  employeeSocialSecurityRate: number;
  employeeUnemploymentRate: number;
  stampTaxRate: number;
  employerSocialSecurityRates: Record<SalaryEmployeeType, number>;
  employerUnemploymentRates: Record<SalaryEmployeeType, number>;
  socialSecurityFloor: number;
  socialSecurityCeiling: number;
  monthlyExemptions: SalaryMonthlyExemption[];
};

export const DEFAULT_2026_SALARY_PARAMETERS: SalaryParameters = {
  year: 2026,
  validFrom: "2026-01-01",
  validTo: "2026-12-31",
  taxBrackets: [
    { lower: 0, upper: 190_000, rate: 0.15 },
    { lower: 190_000, upper: 400_000, rate: 0.2 },
    { lower: 400_000, upper: 1_500_000, rate: 0.27 },
    { lower: 1_500_000, upper: 5_300_000, rate: 0.35 },
    { lower: 5_300_000, upper: 999_999_999, rate: 0.4 },
  ],
  employeeSocialSecurityRate: 0.14,
  employeeUnemploymentRate: 0.01,
  stampTaxRate: 0.00759,
  employerSocialSecurityRates: {
    incentive: 0.1675,
    "no-incentive": 0.2075,
    retired: 0.245,
  },
  employerUnemploymentRates: {
    incentive: 0.02,
    "no-incentive": 0.02,
    retired: 0,
  },
  socialSecurityFloor: 33_030,
  socialSecurityCeiling: 297_270,
  monthlyExemptions: SALARY_MONTHS.map((_, index) => ({
    month: index + 1,
    incomeTax: index < 6 ? 4_211.33 : index === 6 ? 4_537.75 : 5_615.1,
    stampTax: 250.7,
  })),
};

export type SalaryMonthResult = {
  month: number;
  monthLabel: string;
  gross: number;
  rawGross: number;
  net: number;
  socialSecurityBase: number;
  employeeSocialSecurity: number;
  employeeUnemployment: number;
  incomeTaxBase: number;
  incomeTax: number;
  stampTax: number;
  cumulativeIncomeTaxBase: number;
};

export type SalaryCalculationResult = {
  months: SalaryMonthResult[];
  annualGross: number;
  annualNet: number;
  annualEmployerCost: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function socialSecurityBase(gross: number, parameters: SalaryParameters) {
  return Math.min(Math.max(gross, parameters.socialSecurityFloor), parameters.socialSecurityCeiling);
}

export function annualIncomeTax(cumulativeBase: number, parameters: SalaryParameters) {
  const tax = parameters.taxBrackets.reduce((total, bracket) => {
    const taxable = Math.max(0, Math.min(cumulativeBase, bracket.upper) - bracket.lower);
    return total + taxable * bracket.rate;
  }, 0);
  return roundCurrency(tax);
}

function netFromGrossMonth(
  gross: number,
  priorCumulativeBase: number,
  monthIndex: number,
  parameters: SalaryParameters,
) {
  const base = socialSecurityBase(gross, parameters);
  const employeeSocialSecurity = roundCurrency(base * parameters.employeeSocialSecurityRate);
  const employeeUnemployment = roundCurrency(base * parameters.employeeUnemploymentRate);
  const incomeTaxBase = roundCurrency(gross - employeeSocialSecurity - employeeUnemployment);
  const cumulativeIncomeTaxBase = priorCumulativeBase + incomeTaxBase;
  const exemption = parameters.monthlyExemptions[monthIndex];
  const incomeTax = Math.max(
    0,
    roundCurrency(annualIncomeTax(cumulativeIncomeTaxBase, parameters) - annualIncomeTax(priorCumulativeBase, parameters)) - exemption.incomeTax,
  );
  const stampTax = Math.max(0, roundCurrency(gross * parameters.stampTaxRate) - roundCurrency(exemption.stampTax));
  const net = gross - employeeSocialSecurity - employeeUnemployment - incomeTax - stampTax;

  return {
    base,
    employeeSocialSecurity,
    employeeUnemployment,
    incomeTaxBase,
    incomeTax,
    stampTax,
    cumulativeIncomeTaxBase,
    net,
  };
}

function grossFromNetMonth(
  targetNet: number,
  priorCumulativeBase: number,
  monthIndex: number,
  parameters: SalaryParameters,
) {
  let low = targetNet;
  let high = targetNet / 0.5;

  while (netFromGrossMonth(high, priorCumulativeBase, monthIndex, parameters).net < targetNet) {
    high *= 1.5;
  }

  for (let index = 0; index < 40; index += 1) {
    const middle = (low + high) / 2;
    if (netFromGrossMonth(middle, priorCumulativeBase, monthIndex, parameters).net < targetNet) low = middle;
    else high = middle;
  }

  return high;
}

function employerCost(grosses: number[], employeeType: SalaryEmployeeType, parameters: SalaryParameters) {
  return roundCurrency(grosses.reduce((total, gross) => {
    const base = socialSecurityBase(gross, parameters);
    const employerSocialSecurity = roundCurrency(base * parameters.employerSocialSecurityRates[employeeType]);
    const employerUnemployment = roundCurrency(base * parameters.employerUnemploymentRates[employeeType]);
    return total + gross + employerSocialSecurity + employerUnemployment;
  }, 0));
}

function assertAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Maaş tutarı sıfırdan büyük olmalıdır.");
}

export function calculateGrossToNet(
  monthlyGross: number,
  employeeType: SalaryEmployeeType,
  parameters: SalaryParameters = DEFAULT_2026_SALARY_PARAMETERS,
): SalaryCalculationResult {
  assertAmount(monthlyGross);
  let cumulativeBase = 0;
  const months = SALARY_MONTHS.map((monthLabel, monthIndex) => {
    const calculation = netFromGrossMonth(monthlyGross, cumulativeBase, monthIndex, parameters);
    cumulativeBase = calculation.cumulativeIncomeTaxBase;
    return {
      month: monthIndex + 1,
      monthLabel,
      gross: roundCurrency(monthlyGross),
      rawGross: monthlyGross,
      net: roundCurrency(calculation.net),
      socialSecurityBase: calculation.base,
      employeeSocialSecurity: calculation.employeeSocialSecurity,
      employeeUnemployment: calculation.employeeUnemployment,
      incomeTaxBase: calculation.incomeTaxBase,
      incomeTax: calculation.incomeTax,
      stampTax: calculation.stampTax,
      cumulativeIncomeTaxBase: calculation.cumulativeIncomeTaxBase,
    };
  });
  const grosses = months.map((month) => month.rawGross);
  return {
    months,
    annualGross: roundCurrency(months.reduce((total, month) => total + month.gross, 0)),
    annualNet: roundCurrency(months.reduce((total, month) => total + month.net, 0)),
    annualEmployerCost: employerCost(grosses, employeeType, parameters),
  };
}

export function calculateNetToGross(
  monthlyNet: number,
  employeeType: SalaryEmployeeType,
  parameters: SalaryParameters = DEFAULT_2026_SALARY_PARAMETERS,
): SalaryCalculationResult {
  assertAmount(monthlyNet);
  let cumulativeBase = 0;
  const months = SALARY_MONTHS.map((monthLabel, monthIndex) => {
    const rawGross = grossFromNetMonth(monthlyNet, cumulativeBase, monthIndex, parameters);
    const displayedGross = roundCurrency(rawGross);
    const calculation = netFromGrossMonth(rawGross, cumulativeBase, monthIndex, parameters);
    cumulativeBase = calculation.cumulativeIncomeTaxBase;
    return {
      month: monthIndex + 1,
      monthLabel,
      gross: displayedGross,
      rawGross,
      net: roundCurrency(calculation.net),
      socialSecurityBase: calculation.base,
      employeeSocialSecurity: calculation.employeeSocialSecurity,
      employeeUnemployment: calculation.employeeUnemployment,
      incomeTaxBase: calculation.incomeTaxBase,
      incomeTax: calculation.incomeTax,
      stampTax: calculation.stampTax,
      cumulativeIncomeTaxBase: calculation.cumulativeIncomeTaxBase,
    };
  });
  const grosses = months.map((month) => month.rawGross);
  return {
    months,
    annualGross: roundCurrency(months.reduce((total, month) => total + month.gross, 0)),
    annualNet: roundCurrency(months.reduce((total, month) => total + month.net, 0)),
    annualEmployerCost: employerCost(grosses, employeeType, parameters),
  };
}

export function cloneSalaryParameters(parameters: SalaryParameters = DEFAULT_2026_SALARY_PARAMETERS) {
  return JSON.parse(JSON.stringify(parameters)) as SalaryParameters;
}

export function parseSalaryParameters(value: string | null) {
  if (!value) return cloneSalaryParameters();
  try {
    const parsed = JSON.parse(value) as SalaryParameters;
    if (!Array.isArray(parsed.taxBrackets) || parsed.taxBrackets.length === 0 || parsed.monthlyExemptions?.length !== 12) {
      return cloneSalaryParameters();
    }
    return parsed;
  } catch {
    return cloneSalaryParameters();
  }
}

