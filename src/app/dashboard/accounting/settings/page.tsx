import { redirect } from "next/navigation";

/** Moved to Muhasebe → Sabit Tanımlar → Hesaplama Parametreleri. */
export default function LegacyAccountingSettingsPage() {
  redirect("/dashboard/accounting/definitions/parameters");
}
