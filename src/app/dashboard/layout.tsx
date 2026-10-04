import { requireSessionUser } from "@/lib/session";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { DashboardShell } from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ user, authorization, memberships }, moduleCatalog] = await Promise.all([
    requireSessionUser(),
    getModuleCatalog(),
  ]);

  return <DashboardShell user={user} authorization={{ isPlatformAdmin: authorization.isPlatformAdmin, companyId: authorization.companyId, roleName: authorization.roleName, permissions: [...authorization.permissions], modules: [...authorization.modules] }} memberships={memberships} moduleCatalog={moduleCatalog.map(({ key, name }) => ({ key, name }))}>{children}</DashboardShell>;
}
