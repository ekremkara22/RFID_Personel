import "server-only";

import { employeeScopeWhere, type AuthorizationContext } from "@/lib/authorization";
import type { BudgetEmployee } from "@/lib/budget-report";
import { prisma } from "@/lib/prisma";

/** Active personnel in the viewer's data scope with the fields salary and budget screens need. */
export async function getSalaryEmployees(authorization: AuthorizationContext): Promise<BudgetEmployee[]> {
  if (!authorization.companyId) return [];
  const employees = await prisma.employee.findMany({
    where: { ...employeeScopeWhere(authorization), isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      workforceType: true,
      grossSalary: true,
      salaryInsuranceType: true,
      position: { select: { name: true } },
      departmentRef: { select: { name: true, category: { select: { name: true } } } },
    },
    orderBy: [{ department: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
  });
  return employees.map((employee) => ({
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    department: employee.departmentRef?.name ?? employee.department,
    category: employee.departmentRef?.category?.name ?? null,
    position: employee.position?.name ?? null,
    workforceType: employee.workforceType,
    insuranceType: employee.salaryInsuranceType,
    // Decimal is not serialisable to client components; amounts stay well inside double precision.
    grossSalary: employee.grossSalary === null ? null : Number(employee.grossSalary),
  }));
}
