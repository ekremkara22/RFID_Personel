export const MODULES = {
  HR: "HR",
  PRODUCTION_PLANNING: "PRODUCTION_PLANNING",
  ACCOUNTING: "ACCOUNTING",
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

export const MODULE_REGISTRY = [
  {
    key: MODULES.HR,
    name: "İK",
    description: "Personel, PDKS, izin, takvim, cihaz ve insan kaynakları raporları.",
    href: "/dashboard",
    defaultRoles: ["OWNER", "ADMIN", "HR", "SCOPE_MANAGER", "PAYROLL", "DEVICE_TECH", "EMPLOYEE", "OBSERVER"],
    highlights: ["RFID kartlı giriş-çıkış ve mola takibi", "İzin, rapor ve çalışma takvimi yönetimi", "Puantaj, geç kalma ve departman raporları"],
  },
  {
    key: MODULES.PRODUCTION_PLANNING,
    name: "Üretim Planlama",
    description: "İş merkezleri, kapasite planlama, üretim takvimi ve üretim raporları.",
    href: "/dashboard/production",
    defaultRoles: ["OWNER", "ADMIN"],
    highlights: ["İş emirleri ve Gantt planlama", "İş merkezi, istasyon ve kalıp tanımları", "Kapasite ve çevrim süresi analizi"],
  },
  {
    key: MODULES.ACCOUNTING,
    name: "Muhasebe",
    description: "Maaş hesaplama, brütten nete, netten brüte ve bordro sabitleri.",
    href: "/dashboard/accounting",
    defaultRoles: ["OWNER", "ADMIN", "PAYROLL"],
    highlights: ["Brütten nete ve netten brüte maaş hesaplama", "Güncel bordro sabitleri ve vergi dilimleri", "Hesaplama sonuçlarını dışa aktarma"],
  },
] as const satisfies ReadonlyArray<{
  key: ModuleKey;
  name: string;
  description: string;
  href: string;
  defaultRoles: readonly string[];
  highlights: readonly string[];
}>;

export const ALL_MODULE_KEYS = MODULE_REGISTRY.map((item) => item.key);

/**
 * Modules not released to customers yet (product owner decision 2026-10-15): only the platform
 * super admin sees and uses them. Stored role/license rows are kept untouched; they are filtered
 * out of company authorization and company-facing screens until the module is removed from here.
 */
export const UNRELEASED_MODULE_KEYS: readonly string[] = [MODULES.PRODUCTION_PLANNING];

export function isReleasedModule(key: string) {
  return !UNRELEASED_MODULE_KEYS.includes(key);
}

export function moduleLabel(key: string) {
  return MODULE_REGISTRY.find((item) => item.key === key)?.name ?? key;
}

export function defaultRoleModules(roleKey: string): ModuleKey[] {
  return roleKey === "OWNER" || roleKey === "ADMIN"
    ? [MODULES.HR, MODULES.PRODUCTION_PLANNING, MODULES.ACCOUNTING]
    : roleKey === "PAYROLL"
      ? [MODULES.HR, MODULES.ACCOUNTING]
      : [MODULES.HR];
}
