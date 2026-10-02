"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  CloudDownload,
  ChevronDown,
  FileBarChart,
  History,
  HeartPulse,
  ListChecks,
  FileLock2,
  Timer,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Plane,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Users,
  KeyRound,
  X,
} from "lucide-react";
import { logoutAction } from "./actions";
import { setActiveCompanyAction } from "./access-actions";
import { SubmitButton } from "./submit-button";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { MODULES } from "@/lib/module-catalog";
import styles from "./shell.module.css";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    role: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    email: string;
    company?: {
      id: number;
      name: string;
    } | null;
  };
  authorization: { isPlatformAdmin: boolean; companyId: number | null; roleName: string | null; permissions: string[]; modules: string[] };
  memberships: Array<{ companyId: number; companyName: string; roleName: string }>;
};

function getUserFullName(user: DashboardShellProps["user"]) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export function DashboardShell({ children, user, authorization, memberships }: DashboardShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [definitionsOpen, setDefinitionsOpen] = useState(
    pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/access") || pathname.startsWith("/dashboard/companies"),
  );
  const [hrOpen, setHrOpen] = useState(!pathname.startsWith("/dashboard/production"));
  const [productionOpen, setProductionOpen] = useState(pathname.startsWith("/dashboard/production"));
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith("/dashboard/reports"));
  const [calendarOpen, setCalendarOpen] = useState(pathname.startsWith("/dashboard/calendar"));
  const allowed = (permission: string) => authorization.isPlatformAdmin || authorization.permissions.includes(permission);
  const hasModule = (moduleKey: string) => authorization.isPlatformAdmin || (!!authorization.companyId && authorization.modules.includes(moduleKey));
  const hasHr = hasModule(MODULES.HR);
  const hasProduction = hasModule(MODULES.PRODUCTION_PLANNING);
  const productionActive = pathname.startsWith("/dashboard/production");

  const items = [
    ...(hasHr ? [{ href: "/dashboard", label: "Operasyon Özeti", icon: LayoutDashboard }] : []),
    ...(user.role === "SUPERADMIN"
      ? [
          { href: "/dashboard/firmware-updates", label: "Cihaz Yazılım Güncellemeleri", icon: CloudDownload },
        ]
      : hasHr ? [
          ...(allowed(PERMISSIONS.PERSONNEL_VIEW) ? [{ href: "/dashboard/employees", label: "Personel Kayıtları", icon: Users }] : []),
          ...(allowed(PERMISSIONS.MOVEMENT_VIEW) ? [{ href: "/dashboard/movements", label: "Personel Hareketleri", icon: ClipboardList }, { href: "/dashboard/movement-reviews", label: "İncelenecek Hareketler", icon: ListChecks }] : []),
          ...(allowed(PERMISSIONS.LEAVE_VIEW) ? [{ href: "/dashboard/leaves", label: "İzin ve Rapor Yönetimi", icon: Plane }] : []),
          ...(allowed(PERMISSIONS.DEVICE_VIEW) ? [{ href: "/dashboard/devices", label: "RFID Cihazları", icon: MonitorSmartphone }, { href: "/dashboard/device-health", label: "Cihaz Sağlığı", icon: HeartPulse }] : []),
        ] : []),
  ];
  const reportItems = hasHr && allowed(PERMISSIONS.REPORT_VIEW) ? [
    { href: "/dashboard/reports", label: "Rapor Merkezi", icon: FileBarChart },
    { href: "/dashboard/reports/personnel", label: "Personel PDKS", icon: Users },
    { href: "/dashboard/reports/departments", label: "Departman Puantaj", icon: FileBarChart },
    { href: "/dashboard/reports/late-arrivals", label: "Geç Kalma Raporu", icon: Timer },
    { href: "/dashboard/reports/daily-attendance", label: "Günlük Mola ve Mesai", icon: Clock3 },
    ...(allowed(PERMISSIONS.AUDIT_VIEW) ? [{ href: "/dashboard/reports/audit", label: "Audit Raporu", icon: History }] : []),
    { href: "/dashboard/reports/payroll", label: "Aylık Puantaj Onayı", icon: FileLock2 },
  ] : [];
  const calendarItems = hasHr && allowed(PERMISSIONS.CALENDAR_VIEW) ? [
    { href: "/dashboard/calendar", label: "Takvim Görünümü", icon: CalendarDays },
    ...(allowed(PERMISSIONS.CALENDAR_MANAGE) ? [
      { href: "/dashboard/calendar/templates", label: "Takvim Şablonları", icon: CalendarDays },
      { href: "/dashboard/calendar/official-holidays", label: "Resmî Tatiller", icon: CalendarDays },
      { href: "/dashboard/calendar/special-days", label: "Şirket Özel Günleri", icon: CalendarDays },
      { href: "/dashboard/calendar/assignments", label: "Takvim Atamaları", icon: CalendarDays },
      { href: "/dashboard/calendar/exceptions", label: "Günlük İstisnalar", icon: CalendarDays },
      { href: "/dashboard/calendar/conflicts", label: "Takvim Çakışmaları", icon: CalendarDays },
      { href: "/dashboard/calendar/change-logs", label: "Değişiklik Geçmişi", icon: CalendarDays },
    ] : []),
  ] : [];
  const definitionItems = [
    ...(user.role === "SUPERADMIN"
      ? [
          { href: "/dashboard/users", label: "Kullanıcı Tanımları", icon: Users },
          { href: "/dashboard/settings/roles", label: "Rol Tanımları", icon: Tags },
        ]
      : [
          ...(allowed(PERMISSIONS.ACCESS_VIEW) ? [{ href: "/dashboard/access", label: "Kullanıcı Tanımlama", icon: KeyRound }, { href: "/dashboard/access/roles", label: "Rol ve Yetki Tanımları", icon: ShieldCheck }] : []),
          ...(allowed(PERMISSIONS.ACCESS_MANAGE) ? [{ href: "/dashboard/access/teams", label: "Ekip Tanımları", icon: Users }] : []),
          ...(!authorization.companyId || allowed(PERMISSIONS.COMPANY_VIEW) ? [{ href: "/dashboard/companies", label: "Firma Tanım", icon: Building2 }] : []),
          ...(allowed(PERMISSIONS.SETTINGS_MANAGE) ? [{ href: "/dashboard/settings/departments", label: "Departmanlar", icon: Tags }, { href: "/dashboard/settings/branches", label: "Şubeler", icon: Building2 }, { href: "/dashboard/settings/managers", label: "Yöneticiler", icon: Users }] : []),
        ]),
  ];
  const productionItems = hasProduction ? [
    ...(allowed(PERMISSIONS.WORK_CENTER_VIEW) ? [{ href: "/dashboard/production/work-centers", label: "İş Merkezleri", icon: Building2 }] : []),
    ...(allowed(PERMISSIONS.CAPACITY_VIEW) ? [{ href: "/dashboard/production/capacity-planning", label: "Kapasite Planlama", icon: Timer }] : []),
    ...(allowed(PERMISSIONS.PRODUCTION_CALENDAR_VIEW) ? [{ href: "/dashboard/production/calendar", label: "Üretim Takvimi", icon: CalendarDays }] : []),
    ...(allowed(PERMISSIONS.PRODUCTION_REPORT_VIEW) ? [{ href: "/dashboard/production/reports", label: "Üretim Raporları", icon: FileBarChart }] : []),
  ] : [];

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div>
            <p className={styles.brandEyebrow}>RFID Personel Takip</p>
            <h2 className={styles.brandTitle}>Veri Yönetim Paneli</h2>
          </div>
          <button
            type="button"
            className={styles.mobileClose}
            onClick={() => setIsOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`glass-panel ${styles.profileCard}`}>
          <p className={styles.profileName}>{getUserFullName(user)}</p>
          <p className={styles.profileMeta}>
            {user.role === "SUPERADMIN" ? "Super Admin" : `${user.company?.name ?? "Firma"} · ${authorization.roleName ?? "Üyelik"}`}
          </p>
          {memberships.length > 1 ? <form action={setActiveCompanyAction} className={styles.companySwitcher}><select name="companyId" defaultValue={user.company?.id}>{memberships.map((item) => <option key={item.companyId} value={item.companyId}>{item.companyName} · {item.roleName}</option>)}</select><button type="submit">Geç</button></form> : null}
        </div>

        <nav className={styles.nav}>
          {hasHr ? <div className={styles.navGroup}>
            <button type="button" className={`${styles.navItem} ${!productionActive && !pathname.startsWith("/dashboard/access") && !pathname.startsWith("/dashboard/settings") && !pathname.startsWith("/dashboard/companies") ? styles.navItemActive : ""}`} onClick={() => setHrOpen((value) => !value)}><Users size={18}/><span>İK Yönetimi</span><ChevronDown size={16} className={`${styles.navChevron} ${hrOpen ? styles.navChevronOpen : ""}`}/></button>
            {hrOpen ? <div className={styles.subNav}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user.role !== "SUPERADMIN" && calendarItems.length ? (
            <div className={styles.navGroup}>
              <button
                type="button"
                className={`${styles.navItem} ${pathname.startsWith("/dashboard/calendar") ? styles.navItemActive : ""}`}
                onClick={() => setCalendarOpen((value) => !value)}
              >
                <CalendarDays size={18} />
                <span>Çalışma Takvimi</span>
                <ChevronDown
                  size={16}
                  className={`${styles.navChevron} ${calendarOpen ? styles.navChevronOpen : ""}`}
                />
              </button>

              {calendarOpen ? (
                <div className={styles.subNav}>
                  {calendarItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {user.role !== "SUPERADMIN" && reportItems.length ? (
            <div className={styles.navGroup}>
              <button
                type="button"
                className={`${styles.navItem} ${pathname.startsWith("/dashboard/reports") ? styles.navItemActive : ""}`}
                onClick={() => setReportsOpen((value) => !value)}
              >
                <FileBarChart size={18} />
                <span>Raporlar</span>
                <ChevronDown
                  size={16}
                  className={`${styles.navChevron} ${reportsOpen ? styles.navChevronOpen : ""}`}
                />
              </button>

              {reportsOpen ? (
                <div className={styles.subNav}>
                  {reportItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

            </div> : null}
          </div> : null}

          {productionItems.length ? <div className={styles.navGroup}>
            <button type="button" className={`${styles.navItem} ${productionActive ? styles.navItemActive : ""}`} onClick={() => setProductionOpen((value) => !value)}><Building2 size={18}/><span>Üretim Planlama</span><ChevronDown size={16} className={`${styles.navChevron} ${productionOpen ? styles.navChevronOpen : ""}`}/></button>
            {productionOpen ? <div className={styles.subNav}>{productionItems.map((item) => { const Icon = item.icon; const isActive = pathname === item.href; return <Link key={item.href} href={item.href} className={`${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`} onClick={() => setIsOpen(false)}><Icon size={16}/><span>{item.label}</span></Link>; })}</div> : null}
          </div> : null}

          {definitionItems.length > 0 ? (
            <div className={styles.navGroup}>
              <button
                type="button"
                className={`${styles.navItem} ${pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/access") || pathname.startsWith("/dashboard/companies") ? styles.navItemActive : ""}`}
                onClick={() => setDefinitionsOpen((value) => !value)}
              >
                <SlidersHorizontal size={18} />
                <span>Sabit Tanımlar</span>
                <ChevronDown
                  size={16}
                  className={`${styles.navChevron} ${definitionsOpen ? styles.navChevronOpen : ""}`}
                />
              </button>

              {definitionsOpen ? (
                <div className={styles.subNav}>
                  {definitionItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>

        <form action={logoutAction} className={styles.logoutForm}>
          <SubmitButton
            idleLabel="Çıkış Yap"
            pendingLabel="Çıkış Yapılıyor..."
            className={styles.logoutButton}
          />
          <LogOut size={16} className={styles.logoutIcon} />
        </form>
      </aside>

      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={styles.contentArea}>
        <header className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className={styles.mobileEyebrow}>Panel</p>
            <p className={styles.mobileTitle}>
              {user.role === "SUPERADMIN" ? "Super Admin" : "Firma Admin"}
            </p>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
