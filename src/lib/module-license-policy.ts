/** License changes never erase role definitions. Reopening restores configured access. */
export function licensedModules(roleKey: string, roleModules: string[], companyLicenses: string[]): Set<string> {
  const licensed = new Set(companyLicenses);
  return new Set(roleKey === "OWNER" ? companyLicenses : roleModules.filter((key) => licensed.has(key)));
}

import { permissionModule } from "./permission-catalog";
import { MODULE_NEUTRAL_PERMISSIONS, type AuthorizationContext } from "./authorization-scope";

type RoleDefinition = { key: string; modules: { moduleKey: string }[]; permissions: { permission: string }[] };

export function assignableRoleModules(role: RoleDefinition, authorization: AuthorizationContext) {
  const companyModules = authorization.companyModules ?? authorization.modules;
  return role.modules.map((item) => item.moduleKey).filter((key) => authorization.isPlatformAdmin || companyModules.has(key));
}

export function canDelegateRole(role: RoleDefinition, authorization: AuthorizationContext) {
  if (role.key === "OWNER") return false;
  if (authorization.isPlatformAdmin) return true;
  const modules = assignableRoleModules(role, authorization);
  return modules.every((key) => authorization.modules.has(key)) && role.permissions.every(({ permission }) => {
    const moduleKey = permissionModule(permission);
    if (moduleKey && !MODULE_NEUTRAL_PERMISSIONS.has(permission) && !modules.includes(moduleKey)) return true;
    return authorization.permissions.has(permission);
  });
}
