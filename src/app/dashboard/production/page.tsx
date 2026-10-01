import Link from "next/link";
import { Building2, CalendarDays, FileBarChart, Timer } from "lucide-react";
import { can } from "@/lib/authorization";
import { PERMISSIONS, type PermissionCode } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import ui from "../management.module.css";
import styles from "./production.module.css";

const sections = [
  { href: "/dashboard/production/work-centers", title: "İş Merkezleri", description: "Üretim kaynaklarını, çalışma düzenlerini ve merkez bilgilerini yönetin.", icon: Building2, permission: PERMISSIONS.WORK_CENTER_VIEW },
  { href: "/dashboard/production/capacity-planning", title: "Kapasite Planlama", description: "İş merkezlerinin kullanılabilir kapasitesini ve planlanan yükünü izleyin.", icon: Timer, permission: PERMISSIONS.CAPACITY_VIEW },
  { href: "/dashboard/production/calendar", title: "Üretim Takvimi", description: "Planlanan üretimleri gün, hafta ve dönem bazında takip edin.", icon: CalendarDays, permission: PERMISSIONS.PRODUCTION_CALENDAR_VIEW },
  { href: "/dashboard/production/reports", title: "Üretim Raporları", description: "Kapasite, gerçekleşme ve plan sapmalarını raporlayın.", icon: FileBarChart, permission: PERMISSIONS.PRODUCTION_REPORT_VIEW },
];

export default async function ProductionPlanningPage() {
  const { authorization } = await requireSessionUser();
  const visibleSections = sections.filter((section) => can(authorization, section.permission as PermissionCode));
  return <div className={`${ui.managementPage}`}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Üretim modülü</p><h1 className={ui.pageTitle}>Üretim Planlama</h1><p className={ui.pageDescription}>İş merkezlerinden raporlamaya kadar üretim planlama süreçlerini tek modülde yönetin.</p></div></header>
    <section className={styles.moduleGrid}>{visibleSections.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={styles.moduleCard}><div><p className={styles.cardEyebrow}>Üretim Planlama</p><h2>{item.title}</h2><p>{item.description}</p></div><span className={styles.cardIcon}><Icon size={20}/></span></Link>; })}</section>
  </div>;
}
