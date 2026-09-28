import { requireSessionUser } from "@/lib/session";
import { DashboardShell } from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authorization, memberships } = await requireSessionUser();

  return <DashboardShell user={user} authorization={{ isPlatformAdmin: authorization.isPlatformAdmin, roleName: authorization.roleName, permissions: [...authorization.permissions] }} memberships={memberships}>{children}</DashboardShell>;
}
