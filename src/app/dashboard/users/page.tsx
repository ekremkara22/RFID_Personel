import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Search } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { APP_TIME_ZONE } from "@/lib/app-time";
import { activeEntitlementKeys, licenseState, trialDaysLeft, type LicenseState } from "@/lib/module-license-policy";
import { queryRepository } from "@/modules/shared/query-repository";
import { createModuleNameMap, getModuleCatalog } from "@/modules/module-definitions/repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import ui from "../management.module.css";

const statusFilters: Array<{ value: "" | LicenseState; label: string }> = [
  { value: "", label: "Tüm durumlar" },
  { value: "TRIAL", label: "Denemede" },
  { value: "TRIAL_EXPIRED", label: "Deneme bitti" },
  { value: "LICENSED", label: "Lisanslı" },
  { value: "NO_LICENSE", label: "Lisans yok" },
];

function fullName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

function formatLicenseDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeZone: APP_TIME_ZONE }).format(new Date(date.getTime() - 1));
}

export default async function UsersPage(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const statusFilter = statusFilters.find((item) => item.value && item.value === searchParams.status)?.value ?? "";
  const [users, moduleCatalog] = await Promise.all([queryRepository.user.findMany({
    where: {
      role: { in: [Role.SUPERADMIN, Role.COMPANY_ADMIN] },
      ...(query ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { name: { contains: query } },
            { email: { contains: query } },
            { companyAccess: { some: { company: { name: { contains: query } } } } },
          ],
        } : {}),
    },
    include: {
      company: true,
      companyAccess: { include: { company: true }, orderBy: { createdAt: "asc" } },
      deviceAccess: { include: { device: { include: { company: true } } }, orderBy: { createdAt: "asc" } },
      memberships: { include: { company: true }, orderBy: { createdAt: "asc" } },
      moduleEntitlements: true,
    },
    orderBy: { createdAt: "desc" },
  }), getModuleCatalog()]);
  const moduleNamesByKey = createModuleNameMap(moduleCatalog);
  // Evaluated once per request so every row uses the same moment.
  // eslint-disable-next-line react-hooks/purity
  const now = new Date(Date.now());
  const rows = users
    .map((item) => ({ item, state: item.role === Role.SUPERADMIN ? null : licenseState(item, now) }))
    .filter((row) => !statusFilter || row.state === statusFilter);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sistem Yetkilileri</p>
          <h1 className={styles.title}>Kullanici Tanimlari</h1>
          <p className={styles.subtitle}>
            Süper adminleri ve müşterilerin firma adminlerini yönetin; deneme sürelerini ve modül lisanslarını buradan takip edip düzenleyin.
          </p>
        </div>
        <Link href="/dashboard/users/new" className={styles.primaryLinkButton}>
          <CirclePlus size={18} />
          <span>Yeni Kullanici</span>
        </Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <Search size={18} />
            <input name="q" defaultValue={query} placeholder="Ad, e-posta veya firma ile ara" aria-label="Kullanıcı ara" />
            <select name="status" defaultValue={statusFilter} aria-label="Lisans durumu" className={styles.searchSelect}>
              {statusFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button type="submit">Ara</button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kullanici</th>
                <th>Rol</th>
                <th>Lisans durumu</th>
                <th>Firmalar</th>
                <th>Cihazlar</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Kullanici bulunamadi.</td></tr>
              ) : rows.map(({ item, state }) => {
                const companyNames = item.companyAccess.length > 0
                  ? item.companyAccess.map((access) => access.company.name).join(", ")
                  : item.memberships.map((membership) => membership.company.name).join(", ") || item.company?.name || "Firma henüz tanımlanmadı";
                const activeKeys = new Set(activeEntitlementKeys(item, now));
                const moduleSummary = item.role === Role.SUPERADMIN ? "Tüm modüller" : item.moduleEntitlements.length
                  ? item.moduleEntitlements.map((module) => {
                      const name = moduleNamesByKey.get(module.moduleKey) ?? module.moduleKey;
                      if (!activeKeys.has(module.moduleKey)) return `${name} (süresi doldu)`;
                      return module.expiresAt ? `${name} (${formatLicenseDate(module.expiresAt)})` : name;
                    }).join(", ")
                  : "Lisanslı modül yok";
                return (
                  <tr key={item.id}>
                    <td><strong>{fullName(item)}</strong><p className={styles.tableSubText}>{item.email}</p></td>
                    <td>{item.role === Role.SUPERADMIN ? "Super Admin" : "Firma Admin"}{item.selfRegistered ? <p className={styles.tableSubText}>Kendi kaydı</p> : null}</td>
                    <td>
                      {state === null ? <span className={ui.statusNeutral}>Tam yetki</span>
                        : state === "TRIAL" ? <span className={ui.statusWarning}>Denemede · {trialDaysLeft(item, now)} gün</span>
                          : state === "LICENSED" ? <span className={ui.statusBadge}>Lisanslı</span>
                            : state === "TRIAL_EXPIRED" ? <span className={ui.statusDanger}>Deneme bitti</span>
                              : <span className={ui.statusNeutral}>Lisans yok</span>}
                      <p className={styles.tableSubText}>{moduleSummary}</p>
                    </td>
                    <td>{companyNames}</td>
                    <td>{item.deviceAccess.length} cihaz</td>
                    <td><Link href={`/dashboard/users/${item.id}`} className={styles.inlineAction}>Incele</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
