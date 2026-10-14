import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createAccountingPersonnelAction } from "@/modules/accounting/actions";
import { getPersonnelFormOptions } from "@/modules/accounting/repository";
import { AccountingPersonnelForm } from "../personnel-form";
import ui from "../../../../management.module.css";

export default async function NewAccountingPersonnelPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE)) redirect("/dashboard/accounting/definitions/personnel");
  const options = await getPersonnelFormOptions(authorization.companyId);

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Muhasebe · Personel Tanımları</p><h1 className={ui.pageTitle}>Yeni Personel</h1><p className={ui.pageDescription}>Maaş hesaplama ve bütçe raporu için muhasebe personeli ekleyin.</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/accounting/definitions/personnel" className={ui.secondaryAction}><ArrowLeft size={16} />Personel listesi</Link></div>
      </header>
      <AccountingPersonnelForm action={createAccountingPersonnelAction} options={options} canEdit submitLabel="Personeli Kaydet" />
    </div>
  );
}
