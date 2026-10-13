import { requireSessionUser } from "@/lib/session";
import { licenseState, trialDaysLeft } from "@/lib/module-license-policy";
import { getSessionLicense } from "@/modules/licensing/repository";
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

  const license = user.role === "COMPANY_ADMIN" ? await getSessionLicense(user.id, authorization.companyId) : null;
  const showStoreLink = !!license?.isPrincipal;
  const state = license ? licenseState(license.holder) : null;
  const licenseNotice = !showStoreLink || !license
    ? null
    : state === "TRIAL"
      ? { tone: "info" as const, text: `Ücretsiz deneme sürenizin bitmesine ${trialDaysLeft(license.holder)} gün kaldı. Deneme sonunda satın alınmayan modüllere erişim kapanır.` }
      : state === "TRIAL_EXPIRED"
        ? { tone: "warning" as const, text: "Deneme süreniz sona erdi. Modülleri kullanmaya devam etmek için lisans satın alın." }
        : null;

  return <DashboardShell user={user} authorization={{ isPlatformAdmin: authorization.isPlatformAdmin, companyId: authorization.companyId, roleName: authorization.roleName, permissions: [...authorization.permissions], modules: [...authorization.modules] }} memberships={memberships} moduleCatalog={moduleCatalog.map(({ key, name }) => ({ key, name }))} showStoreLink={showStoreLink} licenseNotice={licenseNotice}>{children}</DashboardShell>;
}
