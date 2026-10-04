import { canDelegateRole } from "@/lib/module-license-policy";
import { ActionForm } from "@/app/dashboard/action-form";
import { UserRoundCog } from "lucide-react";
import { notFound } from "next/navigation";
import { transferCompanyOwnershipAction, updateCompanyMembershipAction } from "@/app/dashboard/access-actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { CompanyMembershipStatus, DataScopeMode } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/authorization";
import { createModuleNameMap, getModuleCatalog } from "@/modules/module-definitions/repository";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import ui from "../../../management.module.css";
import styles from "../../../page.module.css";

const scopeLabels: Record<DataScopeMode, string> = {
  COMPANY: "Firmanın tamamı",
  RESTRICTED: "Yalnız seçilen kayıtlar",
  OWN: "Yalnız bağlı personelin kendi kaydı",
  NONE: "Veri erişimi yok",
};

const statusLabels: Record<CompanyMembershipStatus, string> = {
  PENDING: "Bekleyen",
  ACTIVE: "Aktif",
  SUSPENDED: "Askıya alınmış",
  REVOKED: "Erişimi kaldırılmış",
};

export default async function MembershipDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user, authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.ACCESS_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const membershipId = Number((await props.params).id);

  const [membership, roles, branches, departments, employees, devices, teams, moduleCatalog] = await Promise.all([
    queryRepository.companyMembership.findFirst({ where: { id: membershipId, companyId: authorization.companyId }, include: { user: true, role: { include: { permissions: true, modules: true } }, employee: true, branchScopes: true, departmentScopes: true, employeeScopes: true, deviceScopes: true, teamScopes: true, modules: true } }),
    queryRepository.companyRole.findMany({ where: { companyId: authorization.companyId, isActive: true }, include: { permissions: true, modules: true }, orderBy: { name: "asc" } }),
    queryRepository.branch.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.department.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.employee.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    queryRepository.device.findMany({ where: { companyId: authorization.companyId }, orderBy: { name: "asc" } }),
    queryRepository.companyTeam.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    getModuleCatalog(),
  ]);
  if (!membership) notFound();
  const moduleNames = createModuleNameMap(moduleCatalog);

  const canManage = authorization.permissions.has(PERMISSIONS.ACCESS_MANAGE) && membership.userId !== user.id;
  const isOwner = membership.role.key === "OWNER";
  const assignableRoles = roles.filter((role) => canDelegateRole(role, authorization));
  const ownerCandidates = isOwner && membership.userId === user.id && authorization.permissions.has(PERMISSIONS.OWNERSHIP_TRANSFER)
    ? await queryRepository.companyMembership.findMany({ where: { companyId: authorization.companyId, status: "ACTIVE", userId: { not: user.id } }, include: { user: true } })
    : [];

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Kullanıcı yönetimi</p>
          <h1 className={ui.pageTitle}>{membership.user.firstName} {membership.user.lastName}</h1>
          <p className={ui.pageDescription}>{membership.user.email} · {membership.role.name} · {membership.role.modules.map((item) => moduleNames.get(item.moduleKey) ?? item.moduleKey).join(", ") || "Modül tanımsız"}</p>
        </div>
        <span className={ui.summaryIcon}><UserRoundCog size={18} /></span>
      </header>

      {membership.userId === user.id && !isOwner ? <p className={ui.actionFeedback}>Kendi rolünüzü veya veri kapsamınızı değiştiremezsiniz. Bu işlemi başka bir firma yöneticisi yapmalıdır.</p> : null}
      {canManage && !isOwner ? (
        <ActionForm action={updateCompanyMembershipAction} className={ui.formShell}>
          <input type="hidden" name="membershipId" value={membership.id} />
          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>Hesap bilgileri</h2><p>Kullanıcının temel iletişim ve giriş bilgileri.</p></div>
            <div className={ui.formGridThree}>
              <label className={ui.formField}><span>Ad</span><input name="firstName" defaultValue={membership.user.firstName ?? ""} required /></label>
              <label className={ui.formField}><span>Soyad</span><input name="lastName" defaultValue={membership.user.lastName ?? ""} required /></label>
              <label className={ui.formField}><span>Telefon</span><input name="phone" type="tel" defaultValue={membership.user.phone ?? ""} /></label>
              <label className={ui.formField}><span>Kullanıcı adı</span><input name="username" defaultValue={membership.user.username ?? ""} minLength={3} pattern="[a-zA-Z0-9._-]+" placeholder="İsteğe bağlı" /><small className={ui.helpText}>Girilecekse boşluk içermemelidir.</small></label>
              <label className={ui.formField}><span>E-posta</span><input name="email" type="email" defaultValue={membership.user.email} required /></label>
              <label className={ui.formField}><span>Yeni şifre</span><input name="password" type="password" minLength={10} autoComplete="new-password" placeholder="Değişmeyecekse boş bırakın" /><small className={ui.helpText}>Yeni şifre en az 10 karakter olmalıdır.</small></label>
            </div>
          </section>

          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>Rol ve veri kapsamı</h2><p>Modüller ve işlem yetkileri seçilen rolden otomatik alınır. Veri kapsamı görülebilecek kayıtları belirler.</p></div>
            <div className={ui.formGridThree}>
              <label className={ui.formField}><span>Rol</span><select name="roleId" defaultValue={membership.roleId}>{assignableRoles.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.modules.map((item) => moduleNames.get(item.moduleKey) ?? item.moduleKey).join(" + ") || "Modül tanımsız"}</option>)}</select><small className={ui.helpText}>Rol değiştirildiğinde kullanıcının modülleri de yeni role göre güncellenir.</small></label>
              <label className={ui.formField}><span>Üyelik durumu</span><select name="status" defaultValue={membership.status}>{Object.values(CompanyMembershipStatus).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
              <label className={ui.formField}><span>Veri erişim kapsamı</span><select name="scopeMode" defaultValue={membership.scopeMode}>{Object.values(DataScopeMode).map((mode) => <option key={mode} value={mode}>{scopeLabels[mode]}</option>)}</select><small className={ui.helpText}>Kullanıcının firma verilerinin ne kadarını görebileceğini belirler.</small></label>
              <label className={ui.formField}><span>Kullanıcının bağlı olduğu personel</span><select name="employeeId" defaultValue={membership.employeeId ?? ""}><option value="">Personel bağlantısı yok</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select><small className={ui.helpText}>“Yalnız bağlı personelin kendi kaydı” seçildiğinde kullanıcının hangi personel kaydını göreceğini belirler.</small></label>
            </div>
          </section>

          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>Kısıtlı erişim seçimleri</h2><p>“Yalnız seçilen kayıtlar” kapsamında erişilebilecek kayıtları belirleyin.</p></div>
            <div className={ui.formGrid}>
              <Checks title="Şubeler" name="branchIds" items={branches} selected={membership.branchScopes.map((item) => item.branchId)} />
              <Checks title="Departmanlar" name="departmentIds" items={departments} selected={membership.departmentScopes.map((item) => item.departmentId)} />
              <Checks title="Personeller" name="employeeIds" items={employees.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}` }))} selected={membership.employeeScopes.map((item) => item.employeeId)} />
              <Checks title="Ekipler" name="teamIds" items={teams} selected={membership.teamScopes.map((item) => item.teamId)} />
              <Checks title="Cihazlar" name="deviceIds" items={devices} selected={membership.deviceScopes.map((item) => item.deviceId)} />
            </div>
          </section>
          <div className={ui.formActions}><SubmitButton idleLabel="Kullanıcıyı Kaydet" pendingLabel="Kaydediliyor..." className={ui.primaryAction} /></div>
        </ActionForm>
      ) : null}

      {isOwner ? <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Firma sahibi</h2><p>Bu rol korumalıdır; askıya alınamaz veya standart kullanıcı formundan değiştirilemez.</p></div></div>{ownerCandidates.length ? <ActionForm action={transferCompanyOwnershipAction} className={ui.formGrid}><label className={ui.formField}><span>Yeni firma sahibi</span><select name="targetMembershipId" required><option value="">Kullanıcı seçin</option>{ownerCandidates.map((item) => <option key={item.id} value={item.id}>{item.user.email}</option>)}</select></label><div className={ui.formActions}><SubmitButton idleLabel="Sahipliği Devret" pendingLabel="Devrediliyor..." className={ui.dangerAction} /></div></ActionForm> : null}</section> : null}
    </div>
  );
}

function Checks({ title, name, items, selected }: { title: string; name: string; items: Array<{ id: number; name: string }>; selected: number[] }) {
  return <fieldset className={ui.fieldset}><legend>{title}</legend><div className={ui.checkGrid}>{items.length ? items.map((item) => <label key={item.id} className={ui.checkField}><input type="checkbox" name={name} value={item.id} defaultChecked={selected.includes(item.id)} /><span>{item.name}</span></label>) : <span className={ui.helpText}>Tanımlı kayıt yok.</span>}</div></fieldset>;
}
