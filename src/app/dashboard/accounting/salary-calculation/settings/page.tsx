import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { SalarySettingsForm } from "../salary-settings-form";

export default async function SalarySettingsPage() {
  const { authorization } = await requireSessionUser();
  return <SalarySettingsForm canManage={can(authorization, PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE)} />;
}

