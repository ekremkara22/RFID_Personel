export const MODULES = {
  HR: "HR",
  PRODUCTION_PLANNING: "PRODUCTION_PLANNING",
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

export const MODULE_REGISTRY = [
  {
    key: MODULES.HR,
    name: "İK",
    description: "Personel, PDKS, izin, takvim, cihaz ve insan kaynakları raporları.",
    href: "/dashboard",
    defaultRoles: ["OWNER", "ADMIN", "HR", "SCOPE_MANAGER", "PAYROLL", "DEVICE_TECH", "EMPLOYEE", "OBSERVER"],
  },
  {
    key: MODULES.PRODUCTION_PLANNING,
    name: "Üretim Planlama",
    description: "İş merkezleri, kapasite planlama, üretim takvimi ve üretim raporları.",
    href: "/dashboard/production",
    defaultRoles: ["OWNER", "ADMIN"],
  },
] as const satisfies ReadonlyArray<{
  key: ModuleKey;
  name: string;
  description: string;
  href: string;
  defaultRoles: readonly string[];
}>;

export const ALL_MODULE_KEYS = MODULE_REGISTRY.map((item) => item.key);

export function moduleLabel(key: string) {
  return MODULE_REGISTRY.find((item) => item.key === key)?.name ?? key;
}

export function defaultRoleModules(roleKey: string): ModuleKey[] {
  return roleKey === "OWNER" || roleKey === "ADMIN"
    ? [MODULES.HR, MODULES.PRODUCTION_PLANNING]
    : [MODULES.HR];
}
