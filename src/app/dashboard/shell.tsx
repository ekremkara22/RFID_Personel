"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Plane,
  SlidersHorizontal,
  Tags,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "./actions";
import { SubmitButton } from "./submit-button";
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
      name: string;
    } | null;
  };
};

function getUserFullName(user: DashboardShellProps["user"]) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [definitionsOpen, setDefinitionsOpen] = useState(
    pathname.startsWith("/dashboard/settings"),
  );
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith("/dashboard/reports"));
  const [calendarOpen, setCalendarOpen] = useState(pathname.startsWith("/dashboard/calendar"));

  const items = [
    { href: "/dashboard", label: "Operasyon Özeti", icon: LayoutDashboard },
    ...(user.role === "SUPERADMIN"
      ? [{ href: "/dashboard/companies", label: "Firmalar", icon: Building2 }]
      : [
          { href: "/dashboard/employees", label: "Personel Kayıtları", icon: Users },
          { href: "/dashboard/movements", label: "Personel Hareketleri", icon: ClipboardList },
          { href: "/dashboard/leaves", label: "İzin ve Rapor Yönetimi", icon: Plane },
          { href: "/dashboard/devices", label: "RFID Cihazları", icon: MonitorSmartphone },
        ]),
  ];
  const reportItems = [
    { href: "/dashboard/reports", label: "Rapor Merkezi", icon: FileBarChart },
    { href: "/dashboard/reports/personnel", label: "Personel PDKS", icon: Users },
    { href: "/dashboard/reports/departments", label: "Departman Puantaj", icon: FileBarChart },
  ];
  const calendarItems = [
    { href: "/dashboard/calendar", label: "Takvim Görünümü", icon: CalendarDays },
    { href: "/dashboard/calendar/templates", label: "Takvim Şablonları", icon: CalendarDays },
    { href: "/dashboard/calendar/official-holidays", label: "Resmî Tatiller", icon: CalendarDays },
    { href: "/dashboard/calendar/special-days", label: "Şirket Özel Günleri", icon: CalendarDays },
    { href: "/dashboard/calendar/assignments", label: "Takvim Atamaları", icon: CalendarDays },
    { href: "/dashboard/calendar/exceptions", label: "Günlük İstisnalar", icon: CalendarDays },
    { href: "/dashboard/calendar/conflicts", label: "Takvim Çakışmaları", icon: CalendarDays },
    { href: "/dashboard/calendar/change-logs", label: "Değişiklik Geçmişi", icon: CalendarDays },
  ];
  const definitionItems = [
    ...(user.role === "SUPERADMIN"
      ? [
          { href: "/dashboard/settings/company-categories", label: "Firma Kategorileri", icon: Tags },
          { href: "/dashboard/settings/branches", label: "Şubeler", icon: Building2 },
        ]
      : [
          { href: "/dashboard/settings/departments", label: "Departmanlar", icon: Tags },
          { href: "/dashboard/settings/branches", label: "Şubeler", icon: Building2 },
          { href: "/dashboard/settings/managers", label: "Yöneticiler", icon: Users },
        ]),
  ];

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
            {user.role === "SUPERADMIN" ? "Super Admin" : user.company?.name ?? "Firma Admin"}
          </p>
        </div>

        <nav className={styles.nav}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user.role !== "SUPERADMIN" ? (
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
          ) : (
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
                  <Link
                    href="/dashboard/calendar/assignments"
                    className={`${styles.subNavItem} ${pathname === "/dashboard/calendar/assignments" ? styles.subNavItemActive : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <CalendarDays size={16} />
                    <span>Takvim Atamaları</span>
                  </Link>
                </div>
              ) : null}
            </div>
          )}

          {user.role !== "SUPERADMIN" ? (
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

          {definitionItems.length > 0 ? (
            <div className={styles.navGroup}>
              <button
                type="button"
                className={`${styles.navItem} ${pathname.startsWith("/dashboard/settings") ? styles.navItemActive : ""}`}
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
