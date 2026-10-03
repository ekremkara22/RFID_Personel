import { createHash } from "node:crypto";
import { ActionError } from "@/lib/action-error";
import { permissionModule } from "@/lib/permission-catalog";
import { ALL_MODULE_KEYS } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";

export function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export function ids(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map(Number).filter((item) => Number.isSafeInteger(item) && item > 0))];
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function moduleKeys(formData: FormData) {
  return [...new Set(formData.getAll("moduleKeys").filter((item): item is string => typeof item === "string" && ALL_MODULE_KEYS.includes(item as never)))];
}

export function validateModuleSelection(keys: string[]) {
  if (!keys.length) throw new ActionError("Kullanıcı için en az bir modül seçilmelidir.");
}

export function validateDelegatedModules(keys: string[], available: Set<string>, isPlatformAdmin: boolean) {
  if (!isPlatformAdmin && keys.some((key) => !available.has(key))) {
    throw new ActionError("Sahip olmadığınız bir modülü başka kullanıcıya açamazsınız.");
  }
}

export function validatePermissionsForModules(permissions: string[], selectedModules: string[]) {
  if (permissions.some((permission) => {
    const moduleKey = permissionModule(permission);
    return moduleKey !== null && !selectedModules.includes(moduleKey);
  })) throw new ActionError("Seçilen yetkilerin tamamı rol için açılan modüllere ait olmalıdır.");
}

export async function validateScopeIds(companyId: number, branchIds: number[], departmentIds: number[], employeeIds: number[], deviceIds: number[], teamIds: number[]) {
  const [branches, departments, employees, devices, teams] = await Promise.all([
    prisma.branch.count({ where: { id: { in: branchIds }, companyId } }),
    prisma.department.count({ where: { id: { in: departmentIds }, companyId } }),
    prisma.employee.count({ where: { id: { in: employeeIds }, companyId } }),
    prisma.device.count({ where: { id: { in: deviceIds }, companyId } }),
    prisma.companyTeam.count({ where: { id: { in: teamIds }, companyId } }),
  ]);
  if (branches !== branchIds.length || departments !== departmentIds.length || employees !== employeeIds.length || devices !== deviceIds.length || teams !== teamIds.length) {
    throw new ActionError("Kapsam seçimlerinden biri bu firmaya ait değil.");
  }
}
