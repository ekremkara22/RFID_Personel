import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartColumn } from "lucide-react";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import ui from "../../management.module.css";
import { SalaryNavigation } from "./salary-navigation";

export default async function SalaryCalculationLayout({ children }: { children: React.ReactNode }) {
  const { authorization } = await requireSessionUser();
  if (!can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe · Maaş Hesaplama</p>
          <h1 className={ui.pageTitle}>Maaş Hesaplama</h1>
          <p className={ui.pageDescription}>2026 vergi dilimleri, SGK oranları, asgari ücret istisnası ve yıllık kümülatif matrah mantığıyla brütten nete ve netten brüte hesaplama yapın.</p>
        </div>
        <div className={ui.headerActions}><Link href="/dashboard/accounting/budget" className={ui.secondaryAction}><ChartColumn size={16} />Bütçe raporu</Link></div>
      </header>
      <SalaryNavigation />
      {children}
    </div>
  );
}

