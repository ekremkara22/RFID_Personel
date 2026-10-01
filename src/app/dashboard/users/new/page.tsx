import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createDashboardUserAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { Role } from "@/generated/prisma/client";
import { MODULE_CATALOG } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Firma Admin",
  EMPLOYEE: "Personel",
};

export default async function NewUserPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const [roleDefinitions, companies] = await Promise.all([
    prisma.roleDefinition.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const roles = (roleDefinitions.length > 0
    ? roleDefinitions.map((role) => ({ code: role.code, name: role.name }))
    : Object.values(Role).map((role) => ({ code: role, name: roleLabels[role] }))).filter((role)=>role.code !== Role.EMPLOYEE);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Kullanici</p>
          <h1 className={styles.title}>Kullanici Tanimla</h1>
          <p className={styles.subtitle}>Süper admin hesabı veya müşterinin ilk firma adminini oluşturun. Firma adminine yalnız satın aldığı modülleri açın.</p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createDashboardUserAction} className={styles.formGrid}>
          <label className={styles.field}><span>Ad</span><input name="firstName" required /></label>
          <label className={styles.field}><span>Soyad</span><input name="lastName" required /></label>
          <label className={styles.field}><span>Kullanıcı Adı</span><input name="username" minLength={3} pattern="[a-zA-Z0-9._-]+" required /></label>
          <label className={styles.field}><span>E-posta</span><input name="email" type="email" required /></label>
          <label className={styles.field}><span>Telefon</span><input name="phone" type="tel" /></label>
          <label className={styles.field}><span>Sifre</span><input name="password" type="password" minLength={10} required /></label>
          <label className={styles.field}>
            <span>Rol</span>
            <select name="role" defaultValue={Role.COMPANY_ADMIN}>
              {roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}><span>Firma</span><select name="companyIds" defaultValue=""><option value="">Firma seçin</option>{companies.map((company)=><option key={company.id} value={company.id}>{company.name}</option>)}</select><small>Yalnız firma admini oluştururken seçilir.</small></label>
          <fieldset className={`${styles.scopeFieldset} ${styles.fullWidth}`}><legend>Başlangıç Modül Yetkileri</legend><p className={styles.scopeHint}>Firma admini kendi kullanıcılarına yalnız burada açılan modülleri dağıtabilir.</p><div className={styles.permissionCheckGrid}>{MODULE_CATALOG.map((module)=><label key={module.key} className={styles.checkField}><input type="checkbox" name="moduleKeys" value={module.key}/><span className={styles.moduleCheckCopy}><strong>{module.name}</strong><small>{module.description}</small></span></label>)}</div></fieldset>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Kullaniciyi Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
