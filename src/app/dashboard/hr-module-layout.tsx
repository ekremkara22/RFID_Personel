import { redirect } from "next/navigation";
import { canAccessModule } from "@/lib/authorization";
import { MODULES } from "@/lib/module-catalog";
import { requireSessionUser } from "@/lib/session";

export async function HrModuleLayout({ children }: { children: React.ReactNode }) {
  const { authorization } = await requireSessionUser();
  if (!canAccessModule(authorization, MODULES.HR)) redirect("/dashboard/production");
  return children;
}
