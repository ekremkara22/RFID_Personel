import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createAccountingPositionAction, deleteAccountingPositionAction, updateAccountingPositionAction } from "@/modules/accounting/actions";
import { getDefinitionRecords } from "@/modules/accounting/repository";
import { SimpleDefinitionPage } from "@/app/dashboard/simple-definition-page";

export default async function AccountingPositionDefinitionsPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const items = await getDefinitionRecords(authorization.companyId, "position");

  return (
    <SimpleDefinitionPage
      kicker="Muhasebe · Sabit Tanımlar"
      title="Pozisyonlar"
      description="Muhasebe personeli ve bütçe raporunda kullanılan görev/pozisyon tanımları."
      placeholder="Operatör, Uzman, Vardiya Amiri..."
      usageLabel="personel"
      items={items}
      createAction={createAccountingPositionAction}
      updateAction={updateAccountingPositionAction}
      deleteAction={deleteAccountingPositionAction}
      canManage={can(authorization, PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE)}
    />
  );
}
