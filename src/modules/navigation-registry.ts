import { PERMISSIONS } from "@/lib/permission-catalog";
import { MODULES, type ModuleKey } from "@/modules/registry";

export type NavigationIconKey = "building" | "calendar" | "clipboard" | "clock" | "download" | "file-chart" | "history" | "health" | "list" | "lock" | "timer" | "dashboard" | "device" | "plane" | "shield" | "server" | "settings" | "tags" | "users" | "key";
export type NavigationGroup = "platform" | "hr-main" | "hr-calendar" | "hr-reports" | "production" | "definitions";
export type NavigationAudience = "platform" | "company" | "all";

export type NavigationDefinition = {
  href: string;
  label: string;
  icon: NavigationIconKey;
  group: NavigationGroup;
  audience: NavigationAudience;
  module?: ModuleKey;
  permission?: string;
  managePermission?: string;
};

export const NAVIGATION_REGISTRY: readonly NavigationDefinition[] = [
  { href: "/dashboard/server-health", label: "Sunucu Durumu", icon: "server", group: "platform", audience: "platform" },
  { href: "/dashboard", label: "Operasyon Özeti", icon: "dashboard", group: "hr-main", audience: "all", module: MODULES.HR },
  { href: "/dashboard/firmware-updates", label: "Cihaz Yazılım Güncellemeleri", icon: "download", group: "hr-main", audience: "platform", module: MODULES.HR },
  { href: "/dashboard/employees", label: "Personel Kayıtları", icon: "users", group: "hr-main", audience: "all", module: MODULES.HR, permission: PERMISSIONS.PERSONNEL_VIEW },
  { href: "/dashboard/movements", label: "Personel Hareketleri", icon: "clipboard", group: "hr-main", audience: "all", module: MODULES.HR, permission: PERMISSIONS.MOVEMENT_VIEW },
  { href: "/dashboard/movement-reviews", label: "İncelenecek Hareketler", icon: "list", group: "hr-main", audience: "all", module: MODULES.HR, permission: PERMISSIONS.MOVEMENT_VIEW },
  { href: "/dashboard/leaves", label: "İzin ve Rapor Yönetimi", icon: "plane", group: "hr-main", audience: "all", module: MODULES.HR, permission: PERMISSIONS.LEAVE_VIEW },
  { href: "/dashboard/devices", label: "RFID Cihazları", icon: "device", group: "hr-main", audience: "all", module: MODULES.HR, permission: PERMISSIONS.DEVICE_VIEW },
  { href: "/dashboard/device-health", label: "Cihaz Sağlığı", icon: "health", group: "hr-main", audience: "all", module: MODULES.HR, permission: PERMISSIONS.DEVICE_VIEW },

  { href: "/dashboard/calendar", label: "Takvim Görünümü", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW },
  { href: "/dashboard/calendar/templates", label: "Takvim Şablonları", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },
  { href: "/dashboard/calendar/official-holidays", label: "Resmî Tatiller", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },
  { href: "/dashboard/calendar/special-days", label: "Şirket Özel Günleri", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },
  { href: "/dashboard/calendar/assignments", label: "Takvim Atamaları", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },
  { href: "/dashboard/calendar/exceptions", label: "Günlük İstisnalar", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },
  { href: "/dashboard/calendar/conflicts", label: "Takvim Çakışmaları", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },
  { href: "/dashboard/calendar/change-logs", label: "Değişiklik Geçmişi", icon: "calendar", group: "hr-calendar", audience: "all", module: MODULES.HR, permission: PERMISSIONS.CALENDAR_VIEW, managePermission: PERMISSIONS.CALENDAR_MANAGE },

  { href: "/dashboard/reports", label: "Rapor Merkezi", icon: "file-chart", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW },
  { href: "/dashboard/reports/personnel", label: "Personel PDKS", icon: "users", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW },
  { href: "/dashboard/reports/departments", label: "Departman Puantaj", icon: "file-chart", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW },
  { href: "/dashboard/reports/late-arrivals", label: "Geç Kalma Raporu", icon: "timer", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW },
  { href: "/dashboard/reports/daily-attendance", label: "Günlük Mola ve Mesai", icon: "clock", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW },
  { href: "/dashboard/reports/audit", label: "Audit Raporu", icon: "history", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW, managePermission: PERMISSIONS.AUDIT_VIEW },
  { href: "/dashboard/reports/payroll", label: "Aylık Puantaj Onayı", icon: "lock", group: "hr-reports", audience: "all", module: MODULES.HR, permission: PERMISSIONS.REPORT_VIEW },

  { href: "/dashboard/production/definitions", label: "Sabit Tanımlar", icon: "settings", group: "production", audience: "all", module: MODULES.PRODUCTION_PLANNING, permission: PERMISSIONS.WORK_CENTER_VIEW },
  { href: "/dashboard/production/work-orders", label: "İş Emirleri", icon: "clipboard", group: "production", audience: "all", module: MODULES.PRODUCTION_PLANNING, permission: PERMISSIONS.CAPACITY_VIEW },
  { href: "/dashboard/production/gantt", label: "Gantt Planlama", icon: "calendar", group: "production", audience: "all", module: MODULES.PRODUCTION_PLANNING, permission: PERMISSIONS.CAPACITY_VIEW },
  { href: "/dashboard/production/capacity-planning", label: "Kapasite Planlama", icon: "timer", group: "production", audience: "all", module: MODULES.PRODUCTION_PLANNING, permission: PERMISSIONS.CAPACITY_VIEW },
  { href: "/dashboard/production/calendar", label: "Üretim Takvimi", icon: "calendar", group: "production", audience: "all", module: MODULES.PRODUCTION_PLANNING, permission: PERMISSIONS.PRODUCTION_CALENDAR_VIEW },
  { href: "/dashboard/production/reports", label: "Üretim Raporları", icon: "file-chart", group: "production", audience: "all", module: MODULES.PRODUCTION_PLANNING, permission: PERMISSIONS.PRODUCTION_REPORT_VIEW },

  { href: "/dashboard/users", label: "Kullanıcı Tanımları", icon: "users", group: "definitions", audience: "platform" },
  { href: "/dashboard/settings/roles", label: "Rol Tanımları", icon: "tags", group: "definitions", audience: "platform" },
  { href: "/dashboard/settings/modules", label: "Modüller", icon: "settings", group: "definitions", audience: "platform" },
  { href: "/dashboard/access", label: "Kullanıcı Tanımlama", icon: "key", group: "definitions", audience: "company", permission: PERMISSIONS.ACCESS_VIEW },
  { href: "/dashboard/access/roles", label: "Rol ve Yetki Tanımları", icon: "shield", group: "definitions", audience: "company", permission: PERMISSIONS.ACCESS_VIEW },
  { href: "/dashboard/access/teams", label: "Ekip Tanımları", icon: "users", group: "definitions", audience: "company", permission: PERMISSIONS.ACCESS_MANAGE },
  { href: "/dashboard/companies", label: "Firma Tanım", icon: "building", group: "definitions", audience: "company", permission: PERMISSIONS.COMPANY_VIEW },
  { href: "/dashboard/settings/departments", label: "Departmanlar", icon: "tags", group: "definitions", audience: "company", permission: PERMISSIONS.SETTINGS_MANAGE },
  { href: "/dashboard/settings/branches", label: "Şubeler", icon: "building", group: "definitions", audience: "company", permission: PERMISSIONS.SETTINGS_MANAGE },
  { href: "/dashboard/settings/managers", label: "Yöneticiler", icon: "users", group: "definitions", audience: "company", permission: PERMISSIONS.SETTINGS_MANAGE },
] as const;

type NavigationContext = {
  isPlatformAdmin: boolean;
  companyId: number | null;
  permissions: readonly string[];
  modules: readonly string[];
};

export function navigationItems(group: NavigationGroup, context: NavigationContext) {
  return NAVIGATION_REGISTRY.filter((item) => {
    if (item.group !== group) return false;
    if (item.audience === "platform" && !context.isPlatformAdmin) return false;
    if (item.audience === "company" && context.isPlatformAdmin) return false;
    if (item.module && !context.isPlatformAdmin && !context.modules.includes(item.module)) return false;
    if (item.permission && !context.isPlatformAdmin && !context.permissions.includes(item.permission)) return false;
    if (item.managePermission && !context.isPlatformAdmin && !context.permissions.includes(item.managePermission)) return false;
    return true;
  });
}
