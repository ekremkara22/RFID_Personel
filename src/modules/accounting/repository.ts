import "server-only";

import type { SalaryBasisCode, SalaryInsuranceTypeCode } from "@/lib/personnel-profile";
import { prisma } from "@/lib/prisma";
import { cloneSalaryParameters, validateSalaryParameters, type SalaryParameters } from "@/lib/salary-calculation";

// Muhasebe reads only its own tables (Accounting*, SalaryWorksheetRow, SalaryParameterSet);
// İK's Employee and Department data is never used here.

export type WorksheetModeKey = "gross-to-net" | "net-to-gross";

export type WorksheetRowData = {
  name: string;
  department: string;
  position: string;
  collarType: string;
  insuranceType: SalaryInsuranceTypeCode;
  amount: number;
  personnelId: number | null;
};

export type AccountingDefinitionKind = "department" | "position" | "collarType";

export const WORKSHEET_MODE = { "gross-to-net": "GROSS_TO_NET", "net-to-gross": "NET_TO_GROSS" } as const;
export const DEFAULT_COLLAR_TYPES = ["Mavi Yaka", "Beyaz Yaka"];

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
    collarType: row.collarType ?? "",
    insuranceType: row.insuranceType,
    amount: Number(row.amount),
    personnelId: row.personnelId,
  }));
}

/** Every company starts with Mavi Yaka / Beyaz Yaka so the selects are never empty. */
export async function ensureDefaultCollarTypes(companyId: number) {
  const count = await prisma.accountingCollarType.count({ where: { companyId } });
  if (!count) await prisma.accountingCollarType.createMany({ data: DEFAULT_COLLAR_TYPES.map((name) => ({ companyId, name })), skipDuplicates: true });
}

/** Active definition names offered in the salary sheet and personnel selects. */
export async function getAccountingDefinitions(companyId: number | null) {
  if (!companyId) return { departments: [] as string[], positions: [] as string[], collarTypes: DEFAULT_COLLAR_TYPES };
  await ensureDefaultCollarTypes(companyId);
  const where = { companyId, isActive: true };
  const select = { name: true };
  const [departments, positions, collarTypes] = await Promise.all([
    prisma.accountingDepartment.findMany({ where, select, orderBy: { name: "asc" } }),
    prisma.accountingPosition.findMany({ where, select, orderBy: { name: "asc" } }),
    prisma.accountingCollarType.findMany({ where, select, orderBy: { name: "asc" } }),
  ]);
  return {
    departments: departments.map((item) => item.name),
    positions: positions.map((item) => item.name),
    collarTypes: collarTypes.map((item) => item.name),
  };
}

export type DefinitionRecord = { id: number; name: string; isActive: boolean; usage: number };

/** One definition list with how many Muhasebe personnel use each entry. */
export async function getDefinitionRecords(companyId: number, kind: AccountingDefinitionKind): Promise<DefinitionRecord[]> {
  const options = { where: { companyId }, include: { _count: { select: { personnel: true } } }, orderBy: [{ isActive: "desc" as const }, { name: "asc" as const }] };
  if (kind === "collarType") await ensureDefaultCollarTypes(companyId);
  const rows = kind === "department"
    ? await prisma.accountingDepartment.findMany(options)
    : kind === "position"
      ? await prisma.accountingPosition.findMany(options)
      : await prisma.accountingCollarType.findMany(options);
  return rows.map((row) => ({ id: row.id, name: row.name, isActive: row.isActive, usage: row._count.personnel }));
}

const personnelInclude = {
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
  collarType: { select: { id: true, name: true } },
} as const;

export type AccountingPersonnelRecord = {
  id: number;
  firstName: string;
  lastName: string;
  registrationNumber: string | null;
  departmentId: number | null;
  department: string | null;
  positionId: number | null;
  position: string | null;
  collarTypeId: number | null;
  collarType: string | null;
  insuranceType: SalaryInsuranceTypeCode;
  salaryBasis: SalaryBasisCode;
  salaryAmount: number | null;
  hireDate: string | null;
  isActive: boolean;
};

function toRecord(row: Awaited<ReturnType<typeof findPersonnel>>[number]): AccountingPersonnelRecord {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    registrationNumber: row.registrationNumber,
    departmentId: row.departmentId,
    department: row.department?.name ?? null,
    positionId: row.positionId,
    position: row.position?.name ?? null,
    collarTypeId: row.collarTypeId,
    collarType: row.collarType?.name ?? null,
    insuranceType: row.insuranceType,
    // Decimal is not serialisable to client components; amounts stay well inside double precision.
    salaryBasis: row.salaryBasis,
    salaryAmount: row.salaryAmount === null ? null : Number(row.salaryAmount),
    hireDate: row.hireDate ? row.hireDate.toISOString().slice(0, 10) : null,
    isActive: row.isActive,
  };
}

function findPersonnel(companyId: number, where: { id?: number; isActive?: boolean; q?: string } = {}) {
  return prisma.accountingPersonnel.findMany({
    where: {
      companyId,
      ...(where.id ? { id: where.id } : {}),
      ...(where.isActive !== undefined ? { isActive: where.isActive } : {}),
      ...(where.q ? { OR: [{ firstName: { contains: where.q } }, { lastName: { contains: where.q } }, { registrationNumber: { contains: where.q } }] } : {}),
    },
    include: personnelInclude,
    orderBy: [{ isActive: "desc" }, { firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function listAccountingPersonnel(companyId: number | null, filters: { q?: string; status?: "active" | "passive" } = {}) {
  if (!companyId) return [];
  const rows = await findPersonnel(companyId, { q: filters.q, isActive: filters.status === "active" ? true : filters.status === "passive" ? false : undefined });
  return rows.map(toRecord);
}

export async function getAccountingPersonnel(companyId: number | null, id: number) {
  if (!companyId) return null;
  const [row] = await findPersonnel(companyId, { id });
  return row ? toRecord(row) : null;
}

/** Definition options (id + name) for the personnel form, keeping a passive value that is still assigned. */
export async function getPersonnelFormOptions(companyId: number) {
  await ensureDefaultCollarTypes(companyId);
  const select = { id: true, name: true, isActive: true };
  const [departments, positions, collarTypes] = await Promise.all([
    prisma.accountingDepartment.findMany({ where: { companyId }, select, orderBy: { name: "asc" } }),
    prisma.accountingPosition.findMany({ where: { companyId }, select, orderBy: { name: "asc" } }),
    prisma.accountingCollarType.findMany({ where: { companyId }, select, orderBy: { name: "asc" } }),
  ]);
  return { departments, positions, collarTypes };
}

/** Active Muhasebe personnel whose salary basis matches the sheet: gross for Brütten Nete, net for Netten Brüte. */
export async function getSheetPersonnelOptions(companyId: number | null, mode: WorksheetModeKey): Promise<WorksheetRowData[]> {
  if (!companyId) return [];
  const basis: SalaryBasisCode = mode === "gross-to-net" ? "GROSS" : "NET";
  const rows = await findPersonnel(companyId, { isActive: true });
  return rows.filter((row) => row.salaryAmount !== null && row.salaryBasis === basis).map((row) => ({
    personnelId: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    department: row.department?.name ?? "",
    position: row.position?.name ?? "",
    collarType: row.collarType?.name ?? "",
    insuranceType: row.insuranceType,
    amount: Number(row.salaryAmount),
  }));
}
