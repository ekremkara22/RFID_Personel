import { redirect } from "next/navigation";
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
          <p className={ui.pageDescription}>Excel taslağındaki 2026 vergi, SGK, istisna ve yıllık kümülatif matrah mantığıyla hesaplama yapın.</p>
        </div>
      </header>
      <SalaryNavigation />
      {children}
    </div>
  );
}

