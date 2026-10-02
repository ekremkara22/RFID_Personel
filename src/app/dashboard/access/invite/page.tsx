import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { createCompanyUserAction } from "@/app/dashboard/access-actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { DataScopeMode } from "@/generated/prisma/client";
import { moduleLabel } from "@/lib/module-catalog";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import ui from "../../management.module.css";
import styles from "../../page.module.css";

const scopeLabels: Record<DataScopeMode, string> = {
  COMPANY: "Firmanın tamamı",
  RESTRICTED: "Yalnız seçilen kayıtlar",
  OWN: "Yalnız bağlı personelin kendi kaydı",
  NONE: "Veri erişimi yok",
};

export default async function NewCompanyUserPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.permissions.has(PERMISSIONS.ACCESS_MANAGE)) redirect("/dashboard/access");
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");

  const [roles, branches, departments, employees, devices, teams] = await Promise.all([
    prisma.companyRole.findMany({ where: { companyId: authorization.companyId, isActive: true, key: { not: "OWNER" } }, include: { permissions: true, modules: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.device.findMany({ where: { companyId: authorization.companyId }, orderBy: { name: "asc" } }),
    prisma.companyTeam.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const assignableRoles = roles.filter((role) =>
    role.permissions.every((permission) => authorization.permissions.has(permission.permission))
    && (authorization.isPlatformAdmin || role.modules.every((module) => authorization.modules.has(module.moduleKey))),
  );

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Kullanıcı yönetimi</p>
          <h1 className={ui.pageTitle}>Yeni Kullanıcı Tanımla</h1>
          <p className={ui.pageDescription}>Hesap bilgilerini, rolü ve erişebileceği veri kapsamını belirleyin. Kullanabileceği modüller seçilen rolden otomatik alınır.</p>
        </div>
        <span className={ui.summaryIcon}><UserPlus size={18} /></span>
      </header>

      <form action={createCompanyUserAction} className={ui.formShell}>
        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Hesap bilgileri</h2><p>Kullanıcının giriş yaparken kullanacağı temel bilgiler.</p></div>
          <div className={ui.formGridThree}>
            <label className={ui.formField}><span>Ad</span><input name="firstName" required /></label>
            <label className={ui.formField}><span>Soyad</span><input name="lastName" required /></label>
            <label className={ui.formField}><span>Telefon</span><input name="phone" type="tel" /></label>
            <label className={ui.formField}><span>Kullanıcı adı</span><input name="username" required minLength={3} pattern="[a-zA-Z0-9._-]+" autoComplete="username" /></label>
            <label className={ui.formField}><span>E-posta</span><input name="email" type="email" required /></label>
            <label className={ui.formField}><span>Şifre</span><input name="password" type="password" minLength={10} required autoComplete="new-password" /><small className={ui.helpText}>En az 10 karakter olmalıdır.</small></label>
          </div>
        </section>

        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Rol ve veri kapsamı</h2><p>Rol işlem yetkilerini ve kullanılabilir modülleri; veri kapsamı ise hangi kayıtların görülebileceğini belirler.</p></div>
          <div className={ui.formGridThree}>
            <label className={ui.formField}><span>Firma rolü</span><select name="roleId" required>{assignableRoles.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.modules.map((module) => moduleLabel(module.moduleKey)).join(" + ") || "Modül tanımsız"}</option>)}</select><small className={ui.helpText}>Kullanıcının modülleri ve işlem yetkileri seçilen rol üzerinden otomatik uygulanır.</small></label>
            <label className={ui.formField}><span>Veri erişim kapsamı</span><select name="scopeMode" defaultValue={DataScopeMode.RESTRICTED}>{Object.values(DataScopeMode).map((mode) => <option key={mode} value={mode}>{scopeLabels[mode]}</option>)}</select><small className={ui.helpText}>Kullanıcının firma verilerinin ne kadarını görebileceğini belirler.</small></label>
            <label className={ui.formField}><span>Kullanıcının bağlı olduğu personel</span><select name="employeeId" defaultValue=""><option value="">Personel bağlantısı yok</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select><small className={ui.helpText}>“Yalnız bağlı personelin kendi kaydı” seçildiğinde kullanıcının hangi personel kaydını göreceğini belirler.</small></label>
          </div>
        </section>

        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Kısıtlı erişim seçimleri</h2><p>“Yalnız seçilen kayıtlar” kapsamında erişilebilecek şube, departman, personel, ekip ve cihazları belirleyin. Farklı seçim türleri birlikte uygulanır.</p></div>
          <div className={ui.formGrid}>
            <ScopeChecks title="Şubeler" name="branchIds" items={branches} />
            <ScopeChecks title="Departmanlar" name="departmentIds" items={departments} />
            <ScopeChecks title="Personeller" name="employeeIds" items={employees.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}` }))} />
            <ScopeChecks title="Ekipler" name="teamIds" items={teams} />
            <ScopeChecks title="Cihazlar" name="deviceIds" items={devices} />
          </div>
        </section>

        <div className={ui.formActions}><SubmitButton idleLabel="Kullanıcıyı Oluştur" pendingLabel="Oluşturuluyor..." className={ui.primaryAction} /></div>
      </form>
    </div>
  );
}

function ScopeChecks({ title, name, items }: { title: string; name: string; items: Array<{ id: number; name: string }> }) {
  return <fieldset className={ui.fieldset}><legend>{title}</legend><div className={ui.checkGrid}>{items.length ? items.map((item) => <label key={item.id} className={ui.checkField}><input type="checkbox" name={name} value={item.id} /><span>{item.name}</span></label>) : <span className={ui.helpText}>Tanımlı kayıt yok.</span>}</div></fieldset>;
}
