import { createCompanyUserAction } from "@/app/dashboard/access-actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { DataScopeMode } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { MODULE_CATALOG } from "@/lib/module-catalog";
import styles from "../../page.module.css";

export default async function NewCompanyUserPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.permissions.has(PERMISSIONS.ACCESS_MANAGE)) redirect("/dashboard/access");
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const [roles, branches, departments, employees, devices, teams] = await Promise.all([
    prisma.companyRole.findMany({ where: { companyId: authorization.companyId, isActive: true, key: { not: "OWNER" } }, include: { permissions: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }), prisma.department.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }), prisma.employee.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }), prisma.device.findMany({ where: { companyId: authorization.companyId }, orderBy: { name: "asc" } }), prisma.companyTeam.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const assignableRoles = roles.filter((role) => role.permissions.every((permission) => authorization.permissions.has(permission.permission)));
  const availableModules = MODULE_CATALOG.filter((module) => authorization.isPlatformAdmin || authorization.modules.has(module.key));
  return <div className={styles.page}><section className={`glass-panel ${styles.heroCard}`}><div><p className={styles.eyebrow}>Sabit Tanımlar</p><h1 className={styles.title}>Yeni Kullanıcı Tanımla</h1><p className={styles.subtitle}>Kullanıcı doğrudan oluşturulur. Yalnız size açık modülleri ve sahip olduğunuz yetkileri devredebilirsiniz.</p></div></section><section className={`glass-panel ${styles.sectionCard}`}><form action={createCompanyUserAction} className={styles.formGrid}>
    <label className={styles.field}><span>Ad</span><input name="firstName" required /></label><label className={styles.field}><span>Soyad</span><input name="lastName" required /></label><label className={styles.field}><span>Kullanıcı adı</span><input name="username" required minLength={3} pattern="[a-zA-Z0-9._-]+" autoComplete="username" /></label><label className={styles.field}><span>E-posta</span><input name="email" type="email" required /></label><label className={styles.field}><span>Telefon</span><input name="phone" type="tel" /></label><label className={styles.field}><span>Şifre</span><input name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
    <label className={styles.field}><span>Firma rolü</span><select name="roleId" required>{assignableRoles.map((role)=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label className={styles.field}><span>Veri kapsamı</span><select name="scopeMode" defaultValue={DataScopeMode.RESTRICTED}>{Object.values(DataScopeMode).map((mode)=><option key={mode} value={mode}>{mode === "COMPANY" ? "Firmanın tamamı" : mode === "RESTRICTED" ? "Seçili kapsamlar" : mode === "OWN" ? "Yalnız kendi kaydı" : "Erişim yok"}</option>)}</select></label>
    <ModuleChecks modules={availableModules}/><div className={styles.fullWidth}><p className={styles.helperText}>Kısıtlı kapsamta seçilen farklı kapsam türleri birbiriyle kesişir. Hiç seçim yapılmazsa veri erişimi verilmez.</p></div>
    <ScopeChecks title="Şubeler" name="branchIds" items={branches}/><ScopeChecks title="Departmanlar" name="departmentIds" items={departments}/><ScopeChecks title="Açık personeller" name="employeeIds" items={employees.map((item)=>({id:item.id,name:`${item.firstName} ${item.lastName}`}))}/><ScopeChecks title="Ekipler" name="teamIds" items={teams}/><ScopeChecks title="Cihazlar" name="deviceIds" items={devices}/><div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Kullanıcıyı Oluştur" pendingLabel="Oluşturuluyor..." className={styles.primaryButton}/></div>
  </form></section></div>;
}
function ModuleChecks({ modules }: { modules: Array<(typeof MODULE_CATALOG)[number]> }) { return <fieldset className={`${styles.scopeFieldset} ${styles.fullWidth}`}><legend>Modül yetkileri</legend><div className={styles.permissionCheckGrid}>{modules.map((item, index)=><label key={item.key} className={styles.checkField}><input type="checkbox" name="moduleKeys" value={item.key} defaultChecked={index === 0}/><span className={styles.moduleCheckCopy}><strong>{item.name}</strong><small>{item.description}</small></span></label>)}</div></fieldset>; }
function ScopeChecks({ title, name, items }: { title: string; name: string; items: Array<{ id: number; name: string }> }) { return <fieldset className={`${styles.scopeFieldset} ${styles.fullWidth}`}><legend>{title}</legend><div className={styles.permissionCheckGrid}>{items.length ? items.map((item)=><label key={item.id} className={styles.checkField}><input type="checkbox" name={name} value={item.id}/><span>{item.name}</span></label>) : <span className={styles.helperText}>Tanım yok</span>}</div></fieldset>; }
