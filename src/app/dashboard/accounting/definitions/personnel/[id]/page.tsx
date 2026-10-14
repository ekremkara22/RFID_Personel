import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { can } from "@/lib/authorization";
import { parseRouteId } from "@/lib/ids";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { deleteAccountingPersonnelAction, updateAccountingPersonnelAction } from "@/modules/accounting/actions";
import { getAccountingPersonnel, getPersonnelFormOptions } from "@/modules/accounting/repository";
import { AccountingPersonnelForm } from "../personnel-form";
import ui from "../../../../management.module.css";

export default async function AccountingPersonnelDetailPage(props: { params: Promise<{ id: string }> }) {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const id = parseRouteId((await props.params).id);
  const [record, options] = await Promise.all([getAccountingPersonnel(authorization.companyId, id), getPersonnelFormOptions(authorization.companyId)]);
  if (!record) notFound();
  const canEdit = can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Muhasebe · Personel Tanımları</p><h1 className={ui.pageTitle}>{record.firstName} {record.lastName}</h1><p className={ui.pageDescription}>Departman, pozisyon, yaka tipi ve ücret bilgilerini güncelleyin.</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/accounting/definitions/personnel" className={ui.secondaryAction}><ArrowLeft size={16} />Personel listesi</Link></div>
      </header>
      <AccountingPersonnelForm action={updateAccountingPersonnelAction} options={options} record={record} canEdit={canEdit} submitLabel="Değişiklikleri Kaydet" />
      {canEdit ? (
        <section className={ui.dangerZone}>
          <div><h3>Personeli sil</h3><p>Hesaplama listelerindeki satırlar korunur; yalnız personel kartıyla bağlantıları kalkar.</p></div>
          <ActionForm action={deleteAccountingPersonnelAction}><input type="hidden" name="id" value={record.id} /><SubmitButton idleLabel="Personeli Sil" pendingLabel="Siliniyor..." className={ui.dangerAction} /></ActionForm>
        </section>
      ) : null}
    </div>
  );
}
