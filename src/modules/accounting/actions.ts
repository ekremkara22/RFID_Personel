"use server";

import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult } from "@/lib/action-error";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { SALARY_INSURANCE_TYPES, WORKFORCE_TYPES, type SalaryInsuranceTypeCode, type WorkforceTypeCode } from "@/lib/personnel-profile";
import { prisma } from "@/lib/prisma";
import { runFormAction } from "@/lib/run-form-action";
import { validateSalaryParameters } from "@/lib/salary-calculation";
import { requireSessionUser } from "@/lib/session";
import { WORKSHEET_MODE, type WorksheetModeKey, type WorksheetRowData } from "@/modules/accounting/repository";

const MAX_ROWS = 2000;

async function companyFor(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, permission);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  return authorization.companyId;
}

function text(value: unknown, max = 191) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function revalidateAccounting() {
  revalidatePath("/dashboard/accounting/budget");
  revalidatePath("/dashboard/accounting/salary-calculation/gross-to-net");
  revalidatePath("/dashboard/accounting/salary-calculation/net-to-gross");
  revalidatePath("/dashboard/accounting/settings");
}

/** Replaces one salary sheet (Brütten Nete or Netten Brüte) for the active company. */
export async function saveSalaryWorksheetAction(mode: WorksheetModeKey, rows: WorksheetRowData[]): Promise<ActionResult> {
  return runFormAction(async () => {
    const companyId = await companyFor(PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
    if (!(mode in WORKSHEET_MODE)) throw new ActionError("Geçersiz hesaplama listesi.");
    if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw new ActionError(`Bir listede en fazla ${MAX_ROWS} personel olabilir.`);
    const employeeIds = [...new Set(rows.map((row) => row?.employeeId).filter((id): id is number => Number.isSafeInteger(id) && (id as number) > 0))];
    const ownEmployees = employeeIds.length
      ? new Set((await prisma.employee.findMany({ where: { companyId, id: { in: employeeIds } }, select: { id: true } })).map((item) => item.id))
      : new Set<number>();

    const data = rows.map((row, index) => {
      const amount = Number(row?.amount);
      const workforceType = WORKFORCE_TYPES.includes(row?.workforceType as WorkforceTypeCode) ? row.workforceType as WorkforceTypeCode : null;
      const insuranceType = SALARY_INSURANCE_TYPES.includes(row?.insuranceType) ? row.insuranceType : "INCENTIVE" as SalaryInsuranceTypeCode;
      return {
        companyId,
        mode: WORKSHEET_MODE[mode],
        sortOrder: index,
        name: text(row?.name) || `Personel ${index + 1}`,
        department: text(row?.department) || null,
        position: text(row?.position) || null,
        workforceType,
        insuranceType,
        amount: Number.isFinite(amount) && amount > 0 && amount < 10_000_000_000 ? Math.round(amount * 100) / 100 : 0,
        employeeId: row?.employeeId && ownEmployees.has(row.employeeId) ? row.employeeId : null,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.salaryWorksheetRow.deleteMany({ where: { companyId, mode: WORKSHEET_MODE[mode] } });
      if (data.length) await tx.salaryWorksheetRow.createMany({ data });
    }, { timeout: 30_000 });
    revalidatePath("/dashboard/accounting/budget");
  });
}

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
