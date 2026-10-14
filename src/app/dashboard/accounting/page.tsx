import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import ui from "../management.module.css";

/** The budget report is the accounting landing page; this route only explains a missing permission. */
export default async function AccountingPage() {
  const { authorization } = await requireSessionUser();
  if (can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting/budget");

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe modülü</p>
          <h1 className={ui.pageTitle}>Muhasebe</h1>
          <p className={ui.pageDescription}>Bütçe raporu ve maaş hesaplama için görüntüleme yetkisi gerekir.</p>
        </div>
      </header>
      <p className={ui.emptyState}>Bu alan için görüntüleme yetkiniz bulunmuyor. Firma yöneticinizden Maaş Hesaplama görüntüleme yetkisi isteyebilirsiniz.</p>
    </div>
  );
}
