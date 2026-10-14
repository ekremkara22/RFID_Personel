"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { randomUUID } from "node:crypto";
import { actionErrorMessage, ActionError } from "@/lib/action-error";
import { assertPermission, can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { decodeCsv, parsePersonnelSheet, PERSONNEL_IMPORT_MAX_ROWS, type PersonnelImportIssue } from "@/lib/personnel-import";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

export type PersonnelImportResult = {
  ok: boolean;
  message: string;
  issues: PersonnelImportIssue[];
  created: number;
  notes: string[];
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function key(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

async function readSheet(file: File): Promise<unknown[][]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const workbook = name.endsWith(".csv") || name.endsWith(".txt")
    // raw keeps "05.01.2026" and "45.000,50" as typed instead of letting the parser guess types.
    ? XLSX.read(decodeCsv(bytes), { type: "string", raw: true })
    : XLSX.read(bytes, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new ActionError("Dosyada okunabilir bir çalışma sayfası bulunamadı.");
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: false });
}

async function importEmployees(formData: FormData): Promise<Omit<PersonnelImportResult, "ok" | "message"> & { message?: string }> {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.PERSONNEL_CREATE);
  const companyId = authorization.companyId;
  if (!companyId) throw new ActionError("Aktif firma seçilmedi.");
  // Bulk rows can land in any department or branch, so only company-wide scope may import.
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== "COMPANY") throw new ActionError("Toplu içe aktarma için firma genelinde personel yetkisi gerekir.");

  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new ActionError("İçe aktarılacak CSV veya Excel dosyasını seçin.");
  if (file.size > MAX_FILE_BYTES) throw new ActionError("Dosya boyutu 2 MB sınırını aşıyor.");
  if (!/\.(csv|txt|xlsx|xls)$/i.test(file.name)) throw new ActionError("Yalnız .csv, .xlsx veya .xls dosyaları kabul edilir.");
  const createMissing = formData.get("createMissing") === "on";
  const canWriteSalary = can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);

  const sheet = await readSheet(file);
  if (sheet.length - 1 > PERSONNEL_IMPORT_MAX_ROWS) throw new ActionError(`Bir dosyada en fazla ${PERSONNEL_IMPORT_MAX_ROWS} personel aktarılabilir.`);
  const parsed = parsePersonnelSheet(sheet);
  const issues = [...parsed.issues];
  const notes: string[] = [];
  if (!parsed.rows.length && !issues.length) throw new ActionError("Dosyada aktarılacak personel satırı bulunamadı.");

  const [departments, positions, branches, existing] = await Promise.all([
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true, isActive: true } }),
    prisma.position.findMany({ where: { companyId }, select: { id: true, name: true, isActive: true } }),
    prisma.branch.findMany({ where: { companyId }, select: { id: true, name: true, isActive: true } }),
    prisma.employee.findMany({
      where: {
        OR: [
          { companyId, registrationNumber: { in: parsed.rows.flatMap((row) => row.registrationNumber ? [row.registrationNumber] : []) } },
          { email: { in: parsed.rows.flatMap((row) => row.email ? [row.email] : []) } },
          { rfidCardId: { in: parsed.rows.flatMap((row) => row.rfidCardId ? [row.rfidCardId] : []) } },
        ],
      },
      select: { companyId: true, registrationNumber: true, email: true, rfidCardId: true },
    }),
  ]);
  const departmentByName = new Map(departments.map((item) => [key(item.name), item]));
  const positionByName = new Map(positions.map((item) => [key(item.name), item]));
  const branchByName = new Map(branches.map((item) => [key(item.name), item]));
  const takenRegistration = new Set(existing.filter((item) => item.companyId === companyId && item.registrationNumber).map((item) => item.registrationNumber!));
  const takenEmail = new Set(existing.flatMap((item) => item.email ? [item.email] : []));
  const takenRfid = new Set(existing.flatMap((item) => item.rfidCardId ? [item.rfidCardId] : []));
  const newDepartments = new Map<string, string>();
  const newPositions = new Map<string, string>();

  for (const row of parsed.rows) {
    const problems: string[] = [];
    const department = departmentByName.get(key(row.department));
    if (!department) {
      if (createMissing) newDepartments.set(key(row.department), row.department);
      else problems.push(`"${row.department}" departmanı tanımlı değil`);
    } else if (!department.isActive) problems.push(`"${row.department}" departmanı pasif`);
    if (row.position) {
      const position = positionByName.get(key(row.position));
      if (!position) {
        if (createMissing) newPositions.set(key(row.position), row.position);
        else problems.push(`"${row.position}" pozisyonu tanımlı değil`);
      } else if (!position.isActive) problems.push(`"${row.position}" pozisyonu pasif`);
    }
    if (row.branch && !branchByName.get(key(row.branch))?.isActive) problems.push(`"${row.branch}" şubesi tanımlı veya aktif değil`);
    if (row.registrationNumber && takenRegistration.has(row.registrationNumber)) problems.push(`sicil no ${row.registrationNumber} zaten kayıtlı`);
    if (row.email && takenEmail.has(row.email)) problems.push(`e-posta ${row.email} başka bir personelde kayıtlı`);
    if (row.rfidCardId && takenRfid.has(row.rfidCardId)) problems.push(`RFID kart ${row.rfidCardId} başka bir personelde kayıtlı`);
    if (problems.length) issues.push({ line: row.line, message: problems.join("; ") });
  }

  if (issues.length) {
    return { issues: issues.sort((a, b) => a.line - b.line), created: 0, notes, message: `${issues.length} satırda düzeltilmesi gereken sorun var. Dosyadaki hiçbir kayıt eklenmedi; düzeltip tekrar yükleyin.` };
  }
  if (!canWriteSalary && parsed.rows.some((row) => row.grossSalary !== null)) notes.push("Maaş sütunu, maaş hesaplama yetkiniz olmadığı için aktarılmadı.");

  await prisma.$transaction(async (tx) => {
    for (const name of newDepartments.values()) {
      const created = await tx.department.create({ data: { companyId, name }, select: { id: true, name: true, isActive: true } });
      departmentByName.set(key(name), created);
    }
    for (const name of newPositions.values()) {
      const created = await tx.position.create({ data: { companyId, name }, select: { id: true, name: true, isActive: true } });
      positionByName.set(key(name), created);
    }
    await tx.employee.createMany({
      data: parsed.rows.map((row) => {
        const department = departmentByName.get(key(row.department))!;
        const branch = row.branch ? branchByName.get(key(row.branch))! : null;
        return {
          companyId,
          firstName: row.firstName,
          lastName: row.lastName,
          department: department.name,
          departmentId: department.id,
          branch: branch?.name ?? null,
          branchId: branch?.id ?? null,
          positionId: row.position ? positionByName.get(key(row.position))!.id : null,
          workforceType: row.workforceType,
          registrationNumber: row.registrationNumber,
          email: row.email,
          managerName: row.managerName,
          hireDate: row.hireDate,
          age: row.age,
          rfidCardId: row.rfidCardId,
          ...(canWriteSalary ? { grossSalary: row.grossSalary, salaryInsuranceType: row.insuranceType } : {}),
        };
      }),
    });
  }, { timeout: 30_000 });

  if (newDepartments.size) notes.push(`Yeni departman oluşturuldu: ${[...newDepartments.values()].join(", ")}`);
  if (newPositions.size) notes.push(`Yeni pozisyon oluşturuldu: ${[...newPositions.values()].join(", ")}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings/departments");
  revalidatePath("/dashboard/settings/positions");
  revalidatePath("/dashboard/accounting/budget");
  return { issues: [], created: parsed.rows.length, notes };
}

export async function importEmployeesAction(formData: FormData): Promise<PersonnelImportResult> {
  try {
    const result = await importEmployees(formData);
    if (result.issues.length) return { ok: false, message: result.message!, issues: result.issues, created: 0, notes: result.notes };
    return { ok: true, message: `${result.created} personel başarıyla eklendi.`, issues: [], created: result.created, notes: result.notes };
  } catch (error) {
    unstable_rethrow(error);
    const message = actionErrorMessage(error);
    if (message) return { ok: false, message, issues: [], created: 0, notes: [] };
    const reference = randomUUID();
    console.error(`[personnel-import:${reference}]`, error);
    return { ok: false, message: `İçe aktarma sunucu hatası nedeniyle tamamlanamadı. Hata kodu: ${reference}`, issues: [], created: 0, notes: [] };
  }
}
