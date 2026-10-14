import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getAccountingDefinitions, getSalaryEmployees, getSalaryParameters, getSalaryWorksheet, type WorksheetModeKey } from "@/modules/accounting/repository";
import { SalaryCalculator } from "./salary-calculator";

/** Server wrapper shared by both sheets: loads the saved list, company parameters and definitions. */
export async function SalarySheetPage({ mode }: { mode: WorksheetModeKey }) {
  const { authorization } = await requireSessionUser();
  const companyId = authorization.companyId;
  const [rows, parameters, definitions, employees] = await Promise.all([
    getSalaryWorksheet(companyId, mode),
    getSalaryParameters(companyId),
    getAccountingDefinitions(companyId),
    mode === "gross-to-net" ? getSalaryEmployees(authorization) : Promise.resolve([]),
  ]);
  return (
    <SalaryCalculator
      key={mode}
      mode={mode}
      canCalculate={!!companyId && can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE)}
      canExport={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_EXPORT)}
      initialRows={rows}
      parameters={parameters}
      definitions={{ departments: definitions.departments.map((item) => item.name), positions: definitions.positions }}
      employees={employees}
    />
  );
}
