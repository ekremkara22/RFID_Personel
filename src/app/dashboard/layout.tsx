import { requireSessionUser } from "@/lib/session";
import { DashboardShell } from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authorization, memberships } = await requireSessionUser();

  return <DashboardShell user={user} authorization={{ isPlatformAdmin: authorization.isPlatformAdmin, companyId: authorization.companyId, roleName: authorization.roleName, permissions: [...authorization.permissions], modules: [...authorization.modules] }} memberships={memberships}>{children}</DashboardShell>;
}
