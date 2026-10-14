import { can } from "@/lib/authorization";
import { salaryEngineType } from "@/lib/personnel-profile";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getSalaryEmployees } from "@/modules/accounting/repository";
import { SalaryCalculator } from "../salary-calculator";

export default async function GrossToNetPage() {
  const { authorization } = await requireSessionUser();
  const employees = await getSalaryEmployees(authorization);
  return (
    <SalaryCalculator
      mode="gross-to-net"
      canCalculate={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE)}
      canExport={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_EXPORT)}
      employees={employees.flatMap((employee) => employee.grossSalary ? [{ id: employee.id, name: employee.name, grossSalary: employee.grossSalary, employeeType: salaryEngineType(employee.insuranceType) }] : [])}
    />
  );
}
