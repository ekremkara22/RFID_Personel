import Link from "next/link";
import { ArrowUpRight, Filter, History, Search, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { CompanyMembershipStatus } from "@/generated/prisma/client";
import { assertPermission, scopeSummary } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import ui from "../management.module.css";
import { moduleLabel } from "@/lib/module-catalog";

const statusLabels: Record<CompanyMembershipStatus, string> = {
  PENDING: "Bekleyen",
  ACTIVE: "Aktif",
  SUSPENDED: "Askıya alınmış",
  REVOKED: "Erişimi kaldırılmış",
};

function fullName(item: { user: { firstName: string | null; lastName: string | null; name: string | null; email: string } }) {
  return `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || item.user.name || item.user.email;
}

export default async function AccessPage(props: { searchParams: Promise<{ q?: string; status?: string; invite?: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.ACCESS_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");

  const params = await props.searchParams;
  const q = params.q?.trim() ?? "";
  const status = Object.values(CompanyMembershipStatus).includes(params.status as CompanyMembershipStatus)
    ? params.status as CompanyMembershipStatus
    : undefined;
  const canManage = authorization.permissions.has(PERMISSIONS.ACCESS_MANAGE);

  const [company, memberships] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: authorization.companyId }, select: { name: true } }),
    prisma.companyMembership.findMany({
      where: {
        companyId: authorization.companyId,
        ...(status ? { status } : {}),
        ...(q ? { user: { OR: [{ username: { contains: q } }, { email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }] } } : {}),
      },
      include: {
        user: true,
        role: { include: { permissions: true } },
        branchScopes: true,
        departmentScopes: true,
        employeeScopes: true,
        deviceScopes: true,
        teamScopes: { include: { team: { include: { members: true } } } },
        modules: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const inviteLink = params.invite?.startsWith("https://test.flodeska.com/activate/") ? params.invite : "";

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Firma erişim yönetimi</p>
          <h1 className={ui.pageTitle}>Kullanıcılar ve Yetkiler</h1>
          <p className={ui.pageDescription}>{company.name} için kullanıcı üyeliklerini, rolleri ve veri kapsamlarını yönetin.</p>
        </div>
        <div className={ui.headerActions}>
          {canManage ? <Link href="/dashboard/access/invite" className={ui.primaryAction}><UserPlus size={16} />Kullanıcı Tanımla</Link> : null}
          <Link href="/dashboard/access/roles" className={ui.secondaryAction}><ShieldCheck size={16} />Roller</Link>
          {canManage ? <Link href="/dashboard/access/teams" className={ui.secondaryAction}><UsersRound size={16} />Ekipler</Link> : null}
          <Link href="/dashboard/access/audit" className={ui.secondaryAction}><History size={16} />Geçmiş</Link>
        </div>
      </header>

      {inviteLink ? (
        <section className={ui.notice}>
          <h2>Davet bağlantısı hazır</h2>
          <p>Bağlantı tek kullanımlıdır ve 72 saat geçerlidir. E-posta gönderimi yapılmadı.</p>
          <code className={ui.inviteCode}>{inviteLink}</code>
        </section>
      ) : null}

      <section className={ui.surface} aria-label="Kullanıcı filtreleri">
        <form className={`${ui.filterBar} ${ui.filterBarWide}`}>
          <label className={ui.field}><span className={ui.fieldLabel}>Kullanıcı ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={q} placeholder="Ad, soyad veya e-posta" /></span></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Üyelik durumu</span><select className={ui.control} name="status" defaultValue={status ?? ""}><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <button className={ui.filterButton}><Filter size={15} />Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Firma kullanıcıları</h2><p>Rol, durum ve efektif veri kapsamı</p></div><span className={ui.countBadge}>{memberships.length} kullanıcı</span></div>
        <div className={ui.tableViewport}>
          <table className={ui.dataTable}>
            <colgroup><col style={{ width: "25%" }} /><col style={{ width: "18%" }} /><col style={{ width: "13%" }} /><col style={{ width: "25%" }} /><col style={{ width: "9%" }} /><col style={{ width: "10%" }} /></colgroup>
            <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>Modül / veri kapsamı</th><th>İzin</th><th>İşlem</th></tr></thead>
            <tbody>
              {memberships.length ? memberships.map((item) => {
                const context = {
                  ...authorization,
                  companyId: item.companyId,
                  membershipId: item.id,
                  membershipStatus: item.status,
                  roleKey: item.role.key,
                  roleName: item.role.name,
                  permissions: new Set(item.role.permissions.map((permission) => permission.permission)),
                  modules: new Set(item.modules.map((module) => module.moduleKey)),
                  scopeMode: item.scopeMode,
                  employeeId: item.employeeId,
                  branchIds: item.branchScopes.map((scope) => scope.branchId),
                  departmentIds: item.departmentScopes.map((scope) => scope.departmentId),
                  employeeIds: item.employeeScopes.map((scope) => scope.employeeId),
                  deviceIds: item.deviceScopes.map((scope) => scope.deviceId),
                  teamEmployeeIds: item.teamScopes.flatMap((scope) => scope.team.members.map((member) => member.employeeId)),
                  isPlatformAdmin: false,
                  userId: item.userId,
                  sessionVersion: item.sessionVersion,
                };
                const name = fullName(item);
                return (
                  <tr key={item.id}>
                    <td><strong className={ui.primaryText}>{name}</strong><span className={ui.secondaryText}>{item.user.username ? `@${item.user.username} · ` : ""}{item.user.email}</span></td>
                    <td><strong className={ui.primaryText}>{item.role.name}</strong></td>
                    <td><span className={item.status === "ACTIVE" ? ui.statusBadge : ui.statusWarning}><span className={ui.statusDot} />{statusLabels[item.status]}</span></td>
                    <td><strong className={ui.primaryText}>{item.modules.map((module) => moduleLabel(module.moduleKey)).join(", ") || "Modül yok"}</strong><span className={ui.secondaryText}>{scopeSummary(context)}</span></td>
                    <td><strong className={ui.primaryText}>{item.role.permissions.length}</strong><span className={ui.secondaryText}>işlem</span></td>
                    <td><Link href={`/dashboard/access/members/${item.id}`} className={ui.rowAction} aria-label={`${name} rol ve kapsamını incele`}>Yönet <ArrowUpRight size={14} /></Link></td>
                  </tr>
                );
              }) : <tr><td colSpan={6} className={ui.emptyCell}>Filtrelere uygun kullanıcı bulunamadı.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
