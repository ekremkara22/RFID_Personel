import { redirect } from "next/navigation";
import { canAccessModule } from "@/lib/authorization";
import { MODULES } from "@/lib/module-catalog";
import { requireSessionUser } from "@/lib/session";

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const { authorization } = await requireSessionUser();
  if (!canAccessModule(authorization, MODULES.ACCOUNTING)) redirect("/dashboard");
  return children;
}

