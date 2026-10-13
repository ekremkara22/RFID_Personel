import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { SalaryCalculator } from "../salary-calculator";

export default async function NetToGrossPage() {
  const { authorization } = await requireSessionUser();
  return (
    <SalaryCalculator
      mode="net-to-gross"
      canCalculate={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE)}
      canExport={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_EXPORT)}
    />
  );
}

