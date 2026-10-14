import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import type { BudgetEntry } from "@/lib/budget-report";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getSalaryParameters, getSalaryWorksheet, type WorksheetModeKey } from "@/modules/accounting/repository";
import { BudgetDashboard } from "./budget-dashboard";

export default async function BudgetPage() {
  const { user, authorization } = await requireSessionUser();
  if (!can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const companyId = authorization.companyId;
  const [grossRows, netRows, parameters] = await Promise.all([
    getSalaryWorksheet(companyId, "gross-to-net"),
    getSalaryWorksheet(companyId, "net-to-gross"),
    getSalaryParameters(companyId),
  ]);
  const toEntries = (rows: typeof grossRows, mode: WorksheetModeKey): BudgetEntry[] => rows.map((row, index) => ({
    key: `${mode}-${index}`,
    name: row.name,
    department: row.department || null,
    position: row.position || null,
    collarType: row.collarType || null,
    insuranceType: row.insuranceType,
    mode,
    amount: row.amount,
  }));

  return (
    <BudgetDashboard
      companyName={user.company?.name ?? "Firma"}
      grossEntries={toEntries(grossRows, "gross-to-net")}
      netEntries={toEntries(netRows, "net-to-gross")}
      parameters={parameters}
      canExport={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_EXPORT)}
    />
  );
}
