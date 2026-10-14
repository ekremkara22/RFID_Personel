import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getSalaryEmployees } from "@/modules/accounting/repository";
import { BudgetDashboard } from "./budget-dashboard";

export default async function BudgetPage() {
  const { user, authorization } = await requireSessionUser();
  if (!can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const employees = await getSalaryEmployees(authorization);

  return (
    <BudgetDashboard
      companyName={user.company?.name ?? "Firma"}
      employees={employees}
      canExport={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_EXPORT)}
      canEditEmployees={can(authorization, PERMISSIONS.PERSONNEL_UPDATE)}
    />
  );
}
