import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createAccountingDepartmentAction, deleteAccountingDepartmentAction, updateAccountingDepartmentAction } from "@/modules/accounting/actions";
import { getDefinitionRecords } from "@/modules/accounting/repository";
import { SimpleDefinitionPage } from "@/app/dashboard/simple-definition-page";

export default async function AccountingDepartmentDefinitionsPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const items = await getDefinitionRecords(authorization.companyId, "department");

  return (
    <SimpleDefinitionPage
      kicker="Muhasebe · Sabit Tanımlar"
      title="Departmanlar"
      description="Muhasebe personelinin bağlı olduğu departmanlar. İK modülünün departmanlarından bağımsızdır."
      placeholder="Üretim, Muhasebe, Satış..."
      usageLabel="personel"
      items={items}
      createAction={createAccountingDepartmentAction}
      updateAction={updateAccountingDepartmentAction}
      deleteAction={deleteAccountingDepartmentAction}
      canManage={can(authorization, PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE)}
    />
  );
}
