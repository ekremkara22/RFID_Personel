import { ActionForm } from "@/app/dashboard/action-form";
import Link from "next/link";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { deleteCompanyRoleAction } from "@/app/dashboard/access-actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { assertPermission } from "@/lib/authorization";
import { createModuleNameMap, getModuleCatalog } from "@/modules/module-definitions/repository";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

export default async function CompanyRolesPage(props: { searchParams: Promise<{ q?: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.ACCESS_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const q = (await props.searchParams).q?.trim() ?? "";
  const canManage = authorization.permissions.has(PERMISSIONS.ACCESS_MANAGE);
  const [roles, moduleCatalog] = await Promise.all([queryRepository.companyRole.findMany({ where: { companyId: authorization.companyId, ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}) }, include: { modules: true, permissions: true, _count: { select: { memberships: true } } }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] }), getModuleCatalog()]);
  const moduleNames = createModuleNameMap(moduleCatalog);
  return <div className={`${styles.page} ${ui.managementPage}`}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Sabit tanımlar</p><h1 className={ui.pageTitle}>Rol ve Yetki Tanımları</h1><p className={ui.pageDescription}>Rolleri modül, ekran ve işlem yetkileriyle yönetin.</p></div>{canManage ? <Link href="/dashboard/access/roles/new" className={ui.primaryAction}><Plus size={16}/>Yeni Rol</Link> : null}</header>
    <section className={ui.surface}><form className={`${ui.filterBar} ${ui.searchFilterBar}`}><label className={ui.field}><span className={ui.fieldLabel}>Rol ara</span><span className={ui.controlWrap}><Search size={16} className={ui.controlIcon}/><input name="q" defaultValue={q} className={`${ui.control} ${ui.controlWithIcon}`} placeholder="Rol adı veya açıklama"/></span></label><button className={ui.filterButton}>Ara</button></form></section>
    <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Tanımlı roller</h2><p>Hazır ve özel roller</p></div><span className={ui.countBadge}>{roles.length} rol</span></div><div className={ui.tableViewport}><table className={ui.dataTable}><thead><tr><th>Rol</th><th>Modüller</th><th>Yetki</th><th>Kullanıcı</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{roles.length ? roles.map((role)=><tr key={role.id}><td><strong className={ui.primaryText}>{role.name}</strong><span className={ui.secondaryText}>{role.description || (role.isSystem ? "Hazır rol" : "Özel rol")}</span></td><td>{role.modules.map((module)=>moduleNames.get(module.moduleKey) ?? module.moduleKey).join(", ") || "Modül yok"}</td><td>{role.permissions.length} yetki</td><td>{role._count.memberships} kullanıcı</td><td><span className={role.isActive ? ui.statusBadge : ui.statusWarning}>{role.isActive ? "Aktif" : "Pasif"}</span></td><td><div className={ui.toolbarActions}><Link href={`/dashboard/access/roles/${role.id}`} className={ui.rowAction}>İncele <ArrowUpRight size={14}/></Link>{canManage && role._count.memberships === 0 ? <ActionForm action={deleteCompanyRoleAction}><input type="hidden" name="roleId" value={role.id}/><SubmitButton idleLabel="Sil" pendingLabel="Siliniyor..." className={`${ui.dangerAction} ${ui.compactAction}`}/></ActionForm> : null}</div></td></tr>) : <tr><td colSpan={6} className={ui.emptyCell}>Aramaya uygun rol bulunamadı.</td></tr>}</tbody></table></div></section>
  </div>;
}
