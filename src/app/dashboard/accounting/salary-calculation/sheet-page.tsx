import { can } from "@/lib/authorization";
import { MODULES } from "@/lib/module-catalog";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { hasPaidLicenseFor } from "@/modules/licensing/repository";
import { getAccountingDefinitions, getSalaryParameters, getSalaryWorksheet, getSheetPersonnelOptions, type WorksheetModeKey } from "@/modules/accounting/repository";
import { SalaryCalculator } from "./salary-calculator";

/** Server wrapper shared by both sheets: loads the saved list, company parameters and Muhasebe definitions. */
export async function SalarySheetPage({ mode }: { mode: WorksheetModeKey }) {
  const { authorization } = await requireSessionUser();
  const companyId = authorization.companyId;
  const [rows, parameters, definitions, personnel, paidLicense] = await Promise.all([
    getSalaryWorksheet(companyId, mode),
    getSalaryParameters(companyId),
    getAccountingDefinitions(companyId),
    getSheetPersonnelOptions(companyId, mode),
    hasPaidLicenseFor(authorization, MODULES.ACCOUNTING),
  ]);
  return (
    <SalaryCalculator
      key={mode}
      mode={mode}
      canCalculate={!!companyId && can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE)}
      canExport={can(authorization, PERMISSIONS.ACCOUNTING_SALARY_EXPORT)}
      fileTransferLocked={!paidLicense}
      initialRows={rows}
      parameters={parameters}
      definitions={definitions}
      employees={personnel}
    />
  );
}
