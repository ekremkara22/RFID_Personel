import { redirect } from "next/navigation";

/** Payroll constants moved to Muhasebe → Sabit Tanımlar. */
export default function LegacySalarySettingsPage() {
  redirect("/dashboard/accounting/settings");
}
