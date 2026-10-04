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
  ServerCog,
  SlidersHorizontal,
  Tags,
  Users,
  KeyRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "./actions";
import { ActionForm } from "./action-form";
import { setActiveCompanyAction } from "./access-actions";
import { SubmitButton } from "./submit-button";
import { MODULES } from "@/modules/registry";
import { navigationItems, type NavigationIconKey } from "@/modules/navigation-registry";
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
  moduleCatalog: Array<{ key: string; name: string }>;
};

function getUserFullName(user: DashboardShellProps["user"]) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

const navigationIcons: Record<NavigationIconKey, LucideIcon> = {
  building: Building2,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  clock: Clock3,
  download: CloudDownload,
  "file-chart": FileBarChart,
  history: History,
  health: HeartPulse,
  list: ListChecks,
  lock: FileLock2,
  timer: Timer,
  dashboard: LayoutDashboard,
  device: MonitorSmartphone,
  plane: Plane,
  shield: ShieldCheck,
  server: ServerCog,
  settings: SlidersHorizontal,
  tags: Tags,
  users: Users,
  key: KeyRound,
};

export function DashboardShell({ children, user, authorization, memberships, moduleCatalog }: DashboardShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [definitionsOpen, setDefinitionsOpen] = useState(
    pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/access") || pathname.startsWith("/dashboard/companies"),
  );
  const [hrOpen, setHrOpen] = useState(!pathname.startsWith("/dashboard/production"));
  const [productionOpen, setProductionOpen] = useState(pathname.startsWith("/dashboard/production"));
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith("/dashboard/reports"));
  const [calendarOpen, setCalendarOpen] = useState(pathname.startsWith("/dashboard/calendar"));
  const hasModule = (moduleKey: string) => authorization.isPlatformAdmin || (!!authorization.companyId && authorization.modules.includes(moduleKey));
  const hasHr = hasModule(MODULES.HR);
  const hasProduction = hasModule(MODULES.PRODUCTION_PLANNING);
  const productionActive = pathname.startsWith("/dashboard/production");
  const moduleName = (key: string) => moduleCatalog.find((module) => module.key === key)?.name ?? key;

  const navigationContext = { ...authorization, isPlatformAdmin: user.role === "SUPERADMIN" || authorization.isPlatformAdmin };
  const withIcons = (group: Parameters<typeof navigationItems>[0]) =>
    navigationItems(group, navigationContext).map((item) => ({ ...item, icon: navigationIcons[item.icon] }));
  const platformItems = withIcons("platform");
  const items = hasHr ? withIcons("hr-main") : [];
  const reportItems = hasHr ? withIcons("hr-reports") : [];
  const calendarItems = hasHr ? withIcons("hr-calendar") : [];
  const definitionItems = withIcons("definitions");
  const productionItems = hasProduction ? withIcons("production") : [];

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
          {memberships.length > 1 ? <ActionForm action={setActiveCompanyAction} className={styles.companySwitcher}><select name="companyId" defaultValue={user.company?.id}>{memberships.map((item) => <option key={item.companyId} value={item.companyId}>{item.companyName} · {item.roleName}</option>)}</select><button type="submit">Geç</button></ActionForm> : null}
        </div>

        <nav className={styles.nav}>
          {platformItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.navItemActive : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {hasHr ? <div className={styles.navGroup}>
            <button type="button" className={`${styles.navItem} ${!productionActive && !pathname.startsWith("/dashboard/access") && !pathname.startsWith("/dashboard/settings") && !pathname.startsWith("/dashboard/companies") ? styles.navItemActive : ""}`} onClick={() => setHrOpen((value) => !value)}><Users size={18}/><span>{moduleName(MODULES.HR)}</span><ChevronDown size={16} className={`${styles.navChevron} ${hrOpen ? styles.navChevronOpen : ""}`}/></button>
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

          {calendarItems.length ? (
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

          {reportItems.length ? (
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
            <button type="button" className={`${styles.navItem} ${productionActive ? styles.navItemActive : ""}`} onClick={() => setProductionOpen((value) => !value)}><Building2 size={18}/><span>{moduleName(MODULES.PRODUCTION_PLANNING)}</span><ChevronDown size={16} className={`${styles.navChevron} ${productionOpen ? styles.navChevronOpen : ""}`}/></button>
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
