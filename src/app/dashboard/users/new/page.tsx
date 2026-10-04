import ui from "../../management.module.css";
import { ActionForm } from "@/app/dashboard/action-form";
import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createDashboardUserAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function NewUserPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }
  const moduleCatalog = await getModuleCatalog();

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Kullanici</p>
          <h1 className={styles.title}>Kullanici Tanimla</h1>
          <p className={styles.subtitle}>Müşteri firma adminini oluşturun ve satın aldığı modülleri açın. Kullanıcı ilk girişinden sonra kendi firmasını tanımlayacaktır.</p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <ActionForm action={createDashboardUserAction} className={styles.formGrid}>
          <label className={styles.field}><span>Ad</span><input name="firstName" required /></label>
          <label className={styles.field}><span>Soyad</span><input name="lastName" required /></label>
          <label className={styles.field}><span>Kullanıcı Adı</span><input name="username" minLength={3} pattern="[a-zA-Z0-9._-]+" required /></label>
          <label className={styles.field}><span>E-posta</span><input name="email" type="email" required /></label>
          <label className={styles.field}><span>Telefon</span><input name="phone" type="tel" /></label>
          <label className={styles.field}><span>Sifre</span><input name="password" type="password" minLength={10} required /></label>
          <input type="hidden" name="role" value="COMPANY_ADMIN" />
          <label className={styles.field}><span>Rol</span><input value="Firma Admin" readOnly /><small>Firma kaydı kullanıcı tarafından ilk girişten sonra oluşturulur.</small></label>
          <fieldset className={`${styles.scopeFieldset} ${styles.fullWidth}`}><legend>Modül Lisansları</legend><p className={styles.scopeHint}>Firma admini, kendi firmasını oluşturduğunda ve alt kullanıcılarını tanımladığında yalnız burada açılan modülleri kullanabilir.</p><div className={styles.permissionCheckGrid}>{moduleCatalog.map((module)=><label key={module.key} className={styles.checkField}><input type="checkbox" name="moduleKeys" value={module.key}/><span className={styles.moduleCheckCopy}><strong>{module.name}</strong><small>{module.description}</small></span></label>)}</div></fieldset>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Kullaniciyi Kaydet" pendingLabel="Kaydediliyor..." className={ui.primaryAction} />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
