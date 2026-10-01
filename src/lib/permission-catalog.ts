import { MODULES, type ModuleKey } from "@/lib/module-catalog";

export const PERMISSIONS = {
  PERSONNEL_VIEW: "personnel.view",
  PERSONNEL_CREATE: "personnel.create",
  PERSONNEL_UPDATE: "personnel.update",
  PERSONNEL_DELETE: "personnel.delete",
  MOVEMENT_VIEW: "movement.view",
  MOVEMENT_CREATE: "movement.create",
  MOVEMENT_UPDATE: "movement.update",
  MOVEMENT_DELETE: "movement.delete",
  LEAVE_VIEW: "leave.view",
  LEAVE_CREATE: "leave.create",
  LEAVE_APPROVE: "leave.approve",
  LEAVE_DELETE: "leave.delete",
  CALENDAR_VIEW: "calendar.view",
  CALENDAR_MANAGE: "calendar.manage",
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",
  PAYROLL_APPROVE: "payroll.approve",
  COMPANY_VIEW: "company.view",
  COMPANY_UPDATE: "company.update",
  SETTINGS_MANAGE: "settings.manage",
  ACCESS_VIEW: "access.view",
  ACCESS_MANAGE: "access.manage",
  OWNERSHIP_TRANSFER: "ownership.transfer",
  DEVICE_VIEW: "device.view",
  DEVICE_MANAGE: "device.manage",
  DEVICE_SECRET_VIEW: "device.secret.view",
  AUDIT_VIEW: "audit.view",
  WORK_CENTER_VIEW: "production.work_center.view",
  WORK_CENTER_MANAGE: "production.work_center.manage",
  CAPACITY_VIEW: "production.capacity.view",
  CAPACITY_MANAGE: "production.capacity.manage",
  PRODUCTION_CALENDAR_VIEW: "production.calendar.view",
  PRODUCTION_CALENDAR_MANAGE: "production.calendar.manage",
  PRODUCTION_REPORT_VIEW: "production.report.view",
  PRODUCTION_REPORT_EXPORT: "production.report.export",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS = [
  { label: "Personel", items: [[PERMISSIONS.PERSONNEL_VIEW, "Görüntüleme"], [PERMISSIONS.PERSONNEL_CREATE, "Oluşturma"], [PERMISSIONS.PERSONNEL_UPDATE, "Düzenleme"], [PERMISSIONS.PERSONNEL_DELETE, "Silme / pasifleştirme"]] },
  { label: "Hareketler", items: [[PERMISSIONS.MOVEMENT_VIEW, "Görüntüleme"], [PERMISSIONS.MOVEMENT_CREATE, "Hareket ekleme"], [PERMISSIONS.MOVEMENT_UPDATE, "Hareket düzeltme"], [PERMISSIONS.MOVEMENT_DELETE, "Hareket silme"]] },
  { label: "İzinler", items: [[PERMISSIONS.LEAVE_VIEW, "Görüntüleme"], [PERMISSIONS.LEAVE_CREATE, "Talep oluşturma"], [PERMISSIONS.LEAVE_APPROVE, "Onaylama / reddetme"], [PERMISSIONS.LEAVE_DELETE, "Silme"]] },
  { label: "Takvim ve vardiya", items: [[PERMISSIONS.CALENDAR_VIEW, "Görüntüleme"], [PERMISSIONS.CALENDAR_MANAGE, "Tanımları yönetme"]] },
  { label: "Raporlar", items: [[PERMISSIONS.REPORT_VIEW, "Görüntüleme"], [PERMISSIONS.REPORT_EXPORT, "Dışa aktarma"], [PERMISSIONS.PAYROLL_APPROVE, "Puantaj onaylama / kilitleme"]] },
  { label: "Firma ayarları", items: [[PERMISSIONS.COMPANY_VIEW, "Firma görüntüleme"], [PERMISSIONS.COMPANY_UPDATE, "Firma düzenleme"], [PERMISSIONS.SETTINGS_MANAGE, "Şube / departman yönetme"]] },
  { label: "Kullanıcı ve roller", items: [[PERMISSIONS.ACCESS_VIEW, "Kullanıcı / rol görüntüleme"], [PERMISSIONS.ACCESS_MANAGE, "Kullanıcı / rol / kapsam yönetme"], [PERMISSIONS.OWNERSHIP_TRANSFER, "Firma sahipliği devri"]] },
  { label: "Cihazlar", items: [[PERMISSIONS.DEVICE_VIEW, "Durum görüntüleme"], [PERMISSIONS.DEVICE_MANAGE, "Cihaz düzenleme"], [PERMISSIONS.DEVICE_SECRET_VIEW, "Cihaz anahtarı görüntüleme"]] },
  { label: "İşlem geçmişi", items: [[PERMISSIONS.AUDIT_VIEW, "Audit görüntüleme"]] },
] as const;

export const MODULE_PERMISSION_SECTIONS: Record<ModuleKey, Array<{ label: string; items: ReadonlyArray<readonly [PermissionCode, string]> }>> = {
  [MODULES.HR]: PERMISSION_GROUPS.map((group) => ({ label: group.label, items: group.items })),
  [MODULES.PRODUCTION_PLANNING]: [
    { label: "İş Merkezleri", items: [[PERMISSIONS.WORK_CENTER_VIEW, "Görüntüleme"], [PERMISSIONS.WORK_CENTER_MANAGE, "Yeni / düzelt / sil"]] },
    { label: "Kapasite Planlama", items: [[PERMISSIONS.CAPACITY_VIEW, "Görüntüleme"], [PERMISSIONS.CAPACITY_MANAGE, "Plan oluşturma ve düzenleme"]] },
    { label: "Üretim Takvimi", items: [[PERMISSIONS.PRODUCTION_CALENDAR_VIEW, "Görüntüleme"], [PERMISSIONS.PRODUCTION_CALENDAR_MANAGE, "Yeni / düzelt / sil"]] },
    { label: "Üretim Raporları", items: [[PERMISSIONS.PRODUCTION_REPORT_VIEW, "Görüntüleme"], [PERMISSIONS.PRODUCTION_REPORT_EXPORT, "Dışa aktarma"]] },
  ],
};

export function permissionModule(permission: string): ModuleKey | null {
  for (const [moduleKey, sections] of Object.entries(MODULE_PERMISSION_SECTIONS)) {
    if (sections.some((section) => section.items.some(([code]) => code === permission))) return moduleKey as ModuleKey;
  }
  return null;
}

export const ALL_PERMISSIONS = Object.values(MODULE_PERMISSION_SECTIONS).flatMap((sections) => sections.flatMap((group) => group.items.map(([code]) => code)));

const commonRead = [PERMISSIONS.PERSONNEL_VIEW, PERMISSIONS.MOVEMENT_VIEW, PERMISSIONS.LEAVE_VIEW, PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.REPORT_VIEW];

export const READY_COMPANY_ROLES = [
  { key: "OWNER", name: "Firma sahibi", description: "Firmanın son sorumlusudur; sahiplik devri yapabilir.", scope: "COMPANY", permissions: ALL_PERMISSIONS },
  { key: "ADMIN", name: "Firma yöneticisi", description: "Firma içi operasyonu ve kullanıcıları yönetir.", scope: "COMPANY", permissions: ALL_PERMISSIONS.filter((item) => item !== PERMISSIONS.OWNERSHIP_TRANSFER) },
  { key: "HR", name: "İK yetkilisi", description: "Personel, hareket, izin ve takvim süreçlerini yönetir.", scope: "COMPANY", permissions: [...commonRead, PERMISSIONS.PERSONNEL_CREATE, PERMISSIONS.PERSONNEL_UPDATE, PERMISSIONS.PERSONNEL_DELETE, PERMISSIONS.MOVEMENT_CREATE, PERMISSIONS.MOVEMENT_UPDATE, PERMISSIONS.MOVEMENT_DELETE, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_DELETE, PERMISSIONS.CALENDAR_MANAGE, PERMISSIONS.REPORT_EXPORT, PERMISSIONS.AUDIT_VIEW] },
  { key: "SCOPE_MANAGER", name: "Şube/departman yöneticisi", description: "Yalnızca atanmış veri kapsamındaki ekibi yönetir.", scope: "RESTRICTED", permissions: [...commonRead, PERMISSIONS.PERSONNEL_UPDATE, PERMISSIONS.MOVEMENT_CREATE, PERMISSIONS.MOVEMENT_UPDATE, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_APPROVE] },
  { key: "PAYROLL", name: "Muhasebe/bordro kullanıcısı", description: "Rapor ve puantaj süreçlerini yürütür; hareket değiştiremez.", scope: "COMPANY", permissions: [PERMISSIONS.PERSONNEL_VIEW, PERMISSIONS.MOVEMENT_VIEW, PERMISSIONS.LEAVE_VIEW, PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT, PERMISSIONS.PAYROLL_APPROVE] },
  { key: "DEVICE_TECH", name: "Teknik cihaz sorumlusu", description: "Yalnızca atanmış cihazların durumunu ve ayarlarını yönetir.", scope: "RESTRICTED", permissions: [PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_MANAGE] },
  { key: "EMPLOYEE", name: "Çalışan", description: "Yalnızca kendi personel ve izin kayıtlarını görür.", scope: "OWN", permissions: [PERMISSIONS.PERSONNEL_VIEW, PERMISSIONS.MOVEMENT_VIEW, PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.CALENDAR_VIEW] },
  { key: "OBSERVER", name: "Salt okunur gözlemci", description: "Kapsamındaki kayıtları görüntüler; değiştiremez ve dışa aktaramaz.", scope: "RESTRICTED", permissions: commonRead },
] as const;

export function permissionLabel(code: string) {
  for (const sections of Object.values(MODULE_PERMISSION_SECTIONS)) {
    for (const group of sections) {
      const item = group.items.find(([itemCode]) => itemCode === code);
      if (item) return `${group.label}: ${item[1]}`;
    }
  }
  return code;
}
