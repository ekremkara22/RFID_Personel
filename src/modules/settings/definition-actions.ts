"use server";

import { revalidatePath } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { runFormAction } from "@/lib/run-form-action";
import { requireSessionUser } from "@/lib/session";
import { getId, getString } from "@/modules/shared/action-helpers";

type DefinitionKind = "position" | "departmentCategory";

const LABELS: Record<DefinitionKind, { noun: string; path: string }> = {
  position: { noun: "Pozisyon", path: "/dashboard/settings/positions" },
  departmentCategory: { noun: "Departman kategorisi", path: "/dashboard/settings/department-categories" },
};

async function companyContext() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  return authorization.companyId;
}

function readName(formData: FormData, kind: DefinitionKind) {
  const name = getString(formData, "name").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100) throw new ActionError(`${LABELS[kind].noun} adı 2–100 karakter olmalıdır.`);
  return name;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function refresh(kind: DefinitionKind) {
  revalidatePath(LABELS[kind].path);
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings/departments");
  revalidatePath("/dashboard/accounting/budget");
}

async function createDefinition(kind: DefinitionKind, formData: FormData) {
  const companyId = await companyContext();
  const name = readName(formData, kind);
  try {
    if (kind === "position") await prisma.position.create({ data: { companyId, name } });
    else await prisma.departmentCategory.create({ data: { companyId, name } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ActionError(`"${name}" adında bir kayıt zaten var.`);
    throw error;
  }
  refresh(kind);
}

async function updateDefinition(kind: DefinitionKind, formData: FormData) {
  const companyId = await companyContext();
  const id = getId(formData, "id");
  const name = readName(formData, kind);
  const isActive = formData.get("isActive") === "on";
  try {
    const result = kind === "position"
      ? await prisma.position.updateMany({ where: { id, companyId }, data: { name, isActive } })
      : await prisma.departmentCategory.updateMany({ where: { id, companyId }, data: { name, isActive } });
    if (result.count !== 1) throw new ActionError(`${LABELS[kind].noun} bulunamadı.`);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ActionError(`"${name}" adında bir kayıt zaten var.`);
    throw error;
  }
  refresh(kind);
}

async function deleteDefinition(kind: DefinitionKind, formData: FormData) {
  const companyId = await companyContext();
  const id = getId(formData, "id");
  const usage = kind === "position"
    ? await prisma.employee.count({ where: { companyId, positionId: id } })
    : await prisma.department.count({ where: { companyId, categoryId: id } });
  if (usage > 0) {
    throw new ActionError(kind === "position"
      ? `Bu pozisyon ${usage} personelde kullanılıyor. Silmek yerine pasif yapın.`
      : `Bu kategori ${usage} departmanda kullanılıyor. Silmek yerine pasif yapın.`);
  }
  const result = kind === "position"
    ? await prisma.position.deleteMany({ where: { id, companyId } })
    : await prisma.departmentCategory.deleteMany({ where: { id, companyId } });
  if (result.count !== 1) throw new ActionError(`${LABELS[kind].noun} bulunamadı.`);
  refresh(kind);
}

export async function createPositionAction(formData: FormData) {
  return runFormAction(() => createDefinition("position", formData));
}

export async function updatePositionAction(formData: FormData) {
  return runFormAction(() => updateDefinition("position", formData));
}

export async function deletePositionAction(formData: FormData) {
  return runFormAction(() => deleteDefinition("position", formData));
}

export async function createDepartmentCategoryAction(formData: FormData) {
  return runFormAction(() => createDefinition("departmentCategory", formData));
}

export async function updateDepartmentCategoryAction(formData: FormData) {
  return runFormAction(() => updateDefinition("departmentCategory", formData));
}

export async function deleteDepartmentCategoryAction(formData: FormData) {
  return runFormAction(() => deleteDefinition("departmentCategory", formData));
}
