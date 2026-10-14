import "server-only";

import { employeeScopeWhere, type AuthorizationContext } from "@/lib/authorization";
import type { SalaryInsuranceTypeCode, WorkforceTypeCode } from "@/lib/personnel-profile";
import { prisma } from "@/lib/prisma";
import { cloneSalaryParameters, validateSalaryParameters, type SalaryParameters } from "@/lib/salary-calculation";

export type WorksheetModeKey = "gross-to-net" | "net-to-gross";

export type WorksheetRowData = {
  name: string;
  department: string;
  position: string;
  workforceType: WorkforceTypeCode | "";
  insuranceType: SalaryInsuranceTypeCode;
  amount: number;
  employeeId: number | null;
};

export type SalaryEmployeeOption = WorksheetRowData & { id: number };

export const WORKSHEET_MODE = { "gross-to-net": "GROSS_TO_NET", "net-to-gross": "NET_TO_GROSS" } as const;

/** Company payroll constants; falls back to the 2026 defaults until someone saves the settings screen. */
export async function getSalaryParameters(companyId: number | null): Promise<SalaryParameters> {
  if (!companyId) return cloneSalaryParameters();
  const stored = await prisma.salaryParameterSet.findUnique({ where: { companyId }, select: { parametersJson: true } });
  if (!stored) return cloneSalaryParameters();
  try {
    const result = validateSalaryParameters(JSON.parse(stored.parametersJson));
    return result.ok ? result.parameters : cloneSalaryParameters();
  } catch {
    return cloneSalaryParameters();
  }
}

export async function getSalaryWorksheet(companyId: number | null, mode: WorksheetModeKey): Promise<WorksheetRowData[]> {
  if (!companyId) return [];
  const rows = await prisma.salaryWorksheetRow.findMany({ where: { companyId, mode: WORKSHEET_MODE[mode] }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return rows.map((row) => ({
    name: row.name,
    department: row.department ?? "",
    position: row.position ?? "",
    workforceType: row.workforceType ?? "",
    insuranceType: row.insuranceType,
    amount: Number(row.amount),
    employeeId: row.employeeId,
  }));
}

/** Department, category and position names offered in the sheet's selects. */
export async function getAccountingDefinitions(companyId: number | null) {
  if (!companyId) return { departments: [] as { name: string; category: string | null }[], positions: [] as string[] };
  const [departments, positions] = await Promise.all([
    prisma.department.findMany({ where: { companyId, isActive: true }, select: { name: true, category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.position.findMany({ where: { companyId, isActive: true }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    departments: departments.map((item) => ({ name: item.name, category: item.category?.name ?? null })),
    positions: positions.map((item) => item.name),
  };
}

/** Active personnel in the viewer's scope that have a salary on their card, ready to drop into a sheet. */
export async function getSalaryEmployees(authorization: AuthorizationContext): Promise<SalaryEmployeeOption[]> {
  if (!authorization.companyId) return [];
  const employees = await prisma.employee.findMany({
    where: { ...employeeScopeWhere(authorization), isActive: true, grossSalary: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      workforceType: true,
      grossSalary: true,
      salaryInsuranceType: true,
      position: { select: { name: true } },
      departmentRef: { select: { name: true } },
    },
    orderBy: [{ department: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
  });
  return employees.map((employee) => ({
    id: employee.id,
    employeeId: employee.id,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    department: employee.departmentRef?.name ?? employee.department,
    position: employee.position?.name ?? "",
    workforceType: employee.workforceType ?? "",
    insuranceType: employee.salaryInsuranceType,
    // Decimal is not serialisable to client components; amounts stay well inside double precision.
    amount: Number(employee.grossSalary),
  }));
}
