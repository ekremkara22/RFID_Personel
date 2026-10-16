"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, type ActionResult } from "@/lib/action-error";
import { assertPermission } from "@/lib/authorization";
import { MODULES } from "@/lib/module-catalog";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { parseImportDate, parseMoney, SALARY_BASES, SALARY_INSURANCE_TYPES, type SalaryBasisCode, type SalaryInsuranceTypeCode } from "@/lib/personnel-profile";
import { prisma } from "@/lib/prisma";
import { runFormAction } from "@/lib/run-form-action";
import { validateSalaryParameters } from "@/lib/salary-calculation";
import type { SalarySheetCsvRow } from "@/lib/salary-sheet-csv";
import { requireSessionUser } from "@/lib/session";
import { WORKSHEET_MODE, type AccountingDefinitionKind, type WorksheetModeKey, type WorksheetRowData } from "@/modules/accounting/repository";
import { hasPaidLicenseFor } from "@/modules/licensing/repository";
import { getId, getString } from "@/modules/shared/action-helpers";

// Muhasebe writes only its own tables; İK personnel and departments are never touched here.

const MAX_ROWS = 2000;
const DEFINITIONS_PATH = "/dashboard/accounting/definitions";

async function companyFor(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, permission);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  return authorization.companyId;
}

/** CSV/PDF transfer is for paying customers; the 14-day trial alone does not unlock it. */
async function assertPaidAccountingLicense() {
  const { authorization } = await requireSessionUser();
  if (!(await hasPaidLicenseFor(authorization, MODULES.ACCOUNTING))) {
    throw new ActionError("CSV ile içe aktarma lisanslı kullanıcılara açıktır. Muhasebe modülü lisansını alarak etkinleştirebilirsiniz.");
  }
}

function text(value: unknown, max = 191) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function revalidateAccounting() {
  revalidatePath("/dashboard/accounting", "layout");
}

/* ---------- Salary sheets ---------- */

/** Replaces one salary sheet (Brütten Nete or Netten Brüte) for the active company. */
export async function saveSalaryWorksheetAction(mode: WorksheetModeKey, rows: WorksheetRowData[]): Promise<ActionResult> {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
    if (!(mode in WORKSHEET_MODE)) throw new ActionError("Geçersiz hesaplama listesi.");
    if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw new ActionError(`Bir listede en fazla ${MAX_ROWS} personel olabilir.`);
    const personnelIds = [...new Set(rows.map((row) => row?.personnelId).filter((id): id is number => Number.isSafeInteger(id) && (id as number) > 0))];
    const ownPersonnel = personnelIds.length
      ? new Set((await prisma.accountingPersonnel.findMany({ where: { companyId, id: { in: personnelIds } }, select: { id: true } })).map((item) => item.id))
      : new Set<number>();

    const data = rows.map((row, index) => {
      const amount = Number(row?.amount);
      return {
        companyId,
        mode: WORKSHEET_MODE[mode],
        sortOrder: index,
        name: text(row?.name) || `Personel ${index + 1}`,
        department: text(row?.department) || null,
        position: text(row?.position) || null,
        collarType: text(row?.collarType) || null,
        insuranceType: SALARY_INSURANCE_TYPES.includes(row?.insuranceType) ? row.insuranceType : "INCENTIVE" as SalaryInsuranceTypeCode,
        amount: Number.isFinite(amount) && amount > 0 && amount < 10_000_000_000 ? Math.round(amount * 100) / 100 : 0,
        personnelId: row?.personnelId && ownPersonnel.has(row.personnelId) ? row.personnelId : null,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.salaryWorksheetRow.deleteMany({ where: { companyId, mode: WORKSHEET_MODE[mode] } });
      if (data.length) await tx.salaryWorksheetRow.createMany({ data });
    }, { timeout: 30_000 });
    revalidatePath("/dashboard/accounting/budget");
  });
}

/* ---------- Calculation parameters ---------- */

export async function saveSalaryParametersAction(parameters: unknown): Promise<ActionResult> {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE);
    const result = validateSalaryParameters(parameters);
    if (!result.ok) throw new ActionError(result.message);
    const parametersJson = JSON.stringify(result.parameters);
    await prisma.salaryParameterSet.upsert({ where: { companyId }, create: { companyId, parametersJson }, update: { parametersJson } });
    revalidateAccounting();
  });
}

export async function resetSalaryParametersAction(): Promise<ActionResult> {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE);
    await prisma.salaryParameterSet.deleteMany({ where: { companyId } });
    revalidateAccounting();
  });
}

/* ---------- Definitions: departments, positions, collar types ---------- */

const DEFINITION_NOUN: Record<AccountingDefinitionKind, string> = { department: "Departman", position: "Pozisyon", collarType: "Yaka tipi" };

function definitionDelegate(kind: AccountingDefinitionKind) {
  return kind === "department" ? prisma.accountingDepartment : kind === "position" ? prisma.accountingPosition : prisma.accountingCollarType;
}

function readDefinitionName(formData: FormData, kind: AccountingDefinitionKind) {
  const name = text(getString(formData, "name"), 100);
  if (name.length < 2) throw new ActionError(`${DEFINITION_NOUN[kind]} adı 2–100 karakter olmalıdır.`);
  return name;
}

async function createDefinition(kind: AccountingDefinitionKind, formData: FormData) {
  const companyId = await companyFor(PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE);
  const name = readDefinitionName(formData, kind);
  try {
    // Each delegate has the same shape; the cast keeps one code path for the three lists.
    await (definitionDelegate(kind) as typeof prisma.accountingDepartment).create({ data: { companyId, name } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ActionError(`"${name}" adında bir kayıt zaten var.`);
    throw error;
  }
  revalidateAccounting();
}

async function updateDefinition(kind: AccountingDefinitionKind, formData: FormData) {
  const companyId = await companyFor(PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE);
  const id = getId(formData, "id");
  const name = readDefinitionName(formData, kind);
  const isActive = formData.get("isActive") === "on";
  try {
    const result = await (definitionDelegate(kind) as typeof prisma.accountingDepartment).updateMany({ where: { id, companyId }, data: { name, isActive } });
    if (result.count !== 1) throw new ActionError(`${DEFINITION_NOUN[kind]} bulunamadı.`);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ActionError(`"${name}" adında bir kayıt zaten var.`);
    throw error;
  }
  revalidateAccounting();
}

async function deleteDefinition(kind: AccountingDefinitionKind, formData: FormData) {
  const companyId = await companyFor(PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE);
  const id = getId(formData, "id");
  const usage = await prisma.accountingPersonnel.count({ where: { companyId, ...(kind === "department" ? { departmentId: id } : kind === "position" ? { positionId: id } : { collarTypeId: id }) } });
  if (usage > 0) throw new ActionError(`Bu kayıt ${usage} personelde kullanılıyor. Silmek yerine pasif yapın.`);
  const result = await (definitionDelegate(kind) as typeof prisma.accountingDepartment).deleteMany({ where: { id, companyId } });
  if (result.count !== 1) throw new ActionError(`${DEFINITION_NOUN[kind]} bulunamadı.`);
  revalidateAccounting();
}

export async function createAccountingDepartmentAction(formData: FormData) { return runFormAction(() => createDefinition("department", formData)); }
export async function updateAccountingDepartmentAction(formData: FormData) { return runFormAction(() => updateDefinition("department", formData)); }
export async function deleteAccountingDepartmentAction(formData: FormData) { return runFormAction(() => deleteDefinition("department", formData)); }
export async function createAccountingPositionAction(formData: FormData) { return runFormAction(() => createDefinition("position", formData)); }
export async function updateAccountingPositionAction(formData: FormData) { return runFormAction(() => updateDefinition("position", formData)); }
export async function deleteAccountingPositionAction(formData: FormData) { return runFormAction(() => deleteDefinition("position", formData)); }
export async function createAccountingCollarTypeAction(formData: FormData) { return runFormAction(() => createDefinition("collarType", formData)); }
export async function updateAccountingCollarTypeAction(formData: FormData) { return runFormAction(() => updateDefinition("collarType", formData)); }
export async function deleteAccountingCollarTypeAction(formData: FormData) { return runFormAction(() => deleteDefinition("collarType", formData)); }

/* ---------- Muhasebe personnel ---------- */

async function ownedDefinitionId(kind: AccountingDefinitionKind, companyId: number, formData: FormData, field: string) {
  if (!getString(formData, field)) throw new ActionError(`${DEFINITION_NOUN[kind]} seçin.`);
  const id = getId(formData, field);
  const found = await (definitionDelegate(kind) as typeof prisma.accountingDepartment).findFirst({ where: { id, companyId }, select: { id: true } });
  if (!found) throw new ActionError(`Seçilen ${DEFINITION_NOUN[kind].toLocaleLowerCase("tr-TR")} bu firmaya ait değil.`);
  return found.id;
}

async function readPersonnel(formData: FormData, companyId: number) {
  const firstName = text(getString(formData, "firstName"), 100);
  const lastName = text(getString(formData, "lastName"), 100);
  if (!firstName || !lastName) throw new ActionError("Ad ve soyad zorunludur.");
  const insuranceType = getString(formData, "insuranceType") as SalaryInsuranceTypeCode;
  if (!SALARY_INSURANCE_TYPES.includes(insuranceType)) throw new ActionError("Çalışan tipini seçin.");
  const salaryBasis = getString(formData, "salaryBasis") as SalaryBasisCode;
  if (!SALARY_BASES.includes(salaryBasis)) throw new ActionError("Maaş tipini (brüt / net) seçin.");
  const salaryAmount = parseMoney(getString(formData, "salaryAmount"));
  if (salaryAmount === undefined) throw new ActionError("Maaş sıfırdan büyük geçerli bir tutar olmalıdır.");
  const hireDate = parseImportDate(getString(formData, "hireDate"));
  if (hireDate === undefined) throw new ActionError("İşe giriş tarihi geçersiz.");
  return {
    firstName,
    lastName,
    registrationNumber: text(getString(formData, "registrationNumber"), 64) || null,
    departmentId: await ownedDefinitionId("department", companyId, formData, "departmentId"),
    positionId: await ownedDefinitionId("position", companyId, formData, "positionId"),
    collarTypeId: await ownedDefinitionId("collarType", companyId, formData, "collarTypeId"),
    insuranceType,
    salaryBasis,
    salaryAmount,
    hireDate,
  };
}

function duplicateRegistration(error: unknown): never {
  if (isUniqueViolation(error)) throw new ActionError("Bu sicil numarası başka bir muhasebe personelinde kayıtlı.");
  throw error;
}

export async function createAccountingPersonnelAction(formData: FormData) {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
    const data = await readPersonnel(formData, companyId);
    await prisma.accountingPersonnel.create({ data: { ...data, companyId } }).catch(duplicateRegistration);
    revalidateAccounting();
    redirect(`${DEFINITIONS_PATH}/personnel`);
  });
}

export async function updateAccountingPersonnelAction(formData: FormData) {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
    const id = getId(formData, "id");
    const data = await readPersonnel(formData, companyId);
    const result = await prisma.accountingPersonnel.updateMany({ where: { id, companyId }, data: { ...data, isActive: formData.get("isActive") === "on" } }).catch(duplicateRegistration);
    if (result.count !== 1) throw new ActionError("Personel bulunamadı.");
    revalidateAccounting();
  });
}

export async function deleteAccountingPersonnelAction(formData: FormData) {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
    const result = await prisma.accountingPersonnel.deleteMany({ where: { id: getId(formData, "id"), companyId } });
    if (result.count !== 1) throw new ActionError("Personel bulunamadı.");
    revalidateAccounting();
    redirect(`${DEFINITIONS_PATH}/personnel`);
  });
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/**
 * Adds personnel from the CSV template (Ad Soyad; Departman; Pozisyon; Yaka; Çalışan Tipi; Maaş Tipi; Maaş).
 * Rows without a salary type use `defaultBasis` (gross unless the amount column said net).
 * Missing department, position and collar names are created in Muhasebe's own definitions.
 */
export async function importAccountingPersonnelAction(rows: SalarySheetCsvRow[], defaultBasis: SalaryBasisCode = "GROSS"): Promise<ActionResult> {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
    await assertPaidAccountingLicense();
    if (!Array.isArray(rows) || !rows.length) throw new ActionError("Dosyada personel satırı bulunamadı.");
    if (rows.length > MAX_ROWS) throw new ActionError(`Bir dosyada en fazla ${MAX_ROWS} personel aktarılabilir.`);
    const clean = rows.map((row) => ({
      name: text(row?.name, 200),
      department: text(row?.department, 100),
      position: text(row?.position, 100),
      collarType: text(row?.collarType, 100),
      insuranceType: SALARY_INSURANCE_TYPES.includes(row?.insuranceType) ? row.insuranceType : "INCENTIVE" as SalaryInsuranceTypeCode,
      amount: Number(row?.amount),
      basis: (SALARY_BASES.includes(row?.basis as SalaryBasisCode) ? row.basis! : SALARY_BASES.includes(defaultBasis) ? defaultBasis : "GROSS") as SalaryBasisCode,
    })).filter((row) => row.name && Number.isFinite(row.amount) && row.amount > 0);
    if (!clean.length) throw new ActionError("Dosyada adı ve maaşı olan personel satırı bulunamadı.");

    await prisma.$transaction(async (tx) => {
      const ensure = async (kind: AccountingDefinitionKind, names: string[]) => {
        const unique = [...new Set(names.filter(Boolean))];
        const delegate = (kind === "department" ? tx.accountingDepartment : kind === "position" ? tx.accountingPosition : tx.accountingCollarType) as typeof tx.accountingDepartment;
        if (unique.length) await delegate.createMany({ data: unique.map((name) => ({ companyId, name })), skipDuplicates: true });
        const found = await delegate.findMany({ where: { companyId, name: { in: unique } }, select: { id: true, name: true } });
        return new Map(found.map((item) => [item.name.toLocaleLowerCase("tr-TR"), item.id]));
      };
      const departments = await ensure("department", clean.map((row) => row.department));
      const positions = await ensure("position", clean.map((row) => row.position));
      const collars = await ensure("collarType", clean.map((row) => row.collarType));
      const idOf = (map: Map<string, number>, name: string) => name ? map.get(name.toLocaleLowerCase("tr-TR")) ?? null : null;
      await tx.accountingPersonnel.createMany({
        data: clean.map((row) => ({
          companyId,
          ...splitName(row.name),
          departmentId: idOf(departments, row.department),
          positionId: idOf(positions, row.position),
          collarTypeId: idOf(collars, row.collarType),
          insuranceType: row.insuranceType,
          salaryBasis: row.basis,
          salaryAmount: Math.round(row.amount * 100) / 100,
        })),
      });
    }, { timeout: 30_000 });
    revalidateAccounting();
  });
}
