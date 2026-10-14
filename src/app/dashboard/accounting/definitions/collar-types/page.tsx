import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createAccountingCollarTypeAction, deleteAccountingCollarTypeAction, updateAccountingCollarTypeAction } from "@/modules/accounting/actions";
import { getDefinitionRecords } from "@/modules/accounting/repository";
import { SimpleDefinitionPage } from "@/app/dashboard/simple-definition-page";

export default async function AccountingCollarTypeDefinitionsPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const items = await getDefinitionRecords(authorization.companyId, "collarType");

  return (
    <SimpleDefinitionPage
      kicker="Muhasebe · Sabit Tanımlar"
      title="Yaka Tipleri"
      description="Personel tipi tanımları (ör. Mavi Yaka, Beyaz Yaka). Bütçe raporu bu tiplere göre gruplanır."
      placeholder="Mavi Yaka, Beyaz Yaka..."
      usageLabel="personel"
      items={items}
      createAction={createAccountingCollarTypeAction}
      updateAction={updateAccountingCollarTypeAction}
      deleteAction={deleteAccountingCollarTypeAction}
      canManage={can(authorization, PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE)}
    />
  );
}
