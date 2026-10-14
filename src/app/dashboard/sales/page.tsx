import { redirect } from "next/navigation";
import { requireSalesAdmin } from "./sales-shared";

export default async function SalesIndexPage() {
  await requireSalesAdmin();
  redirect("/dashboard/sales/orders");
}
