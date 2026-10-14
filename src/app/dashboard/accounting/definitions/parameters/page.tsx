import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getSalaryParameters } from "@/modules/accounting/repository";
import { SalaryParametersForm } from "./parameters-form";
import ui from "../../../management.module.css";

export default async function AccountingParametersPage() {
  const { authorization } = await requireSessionUser();
  if (!can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const parameters = await getSalaryParameters(authorization.companyId);

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe · Sabit Tanımlar</p>
          <h1 className={ui.pageTitle}>Hesaplama Parametreleri</h1>
          <p className={ui.pageDescription}>Maaş hesaplama ve bütçe raporunda kullanılan vergi dilimleri, SGK oranları, taban/tavan ve aylık istisnalar. Değerler firmadaki tüm muhasebe kullanıcıları için geçerlidir.</p>
        </div>
        <span className={ui.countBadge}>{parameters.year}</span>
      </header>
      <SalaryParametersForm initial={parameters} canManage={can(authorization, PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE)} />
    </div>
  );
}
