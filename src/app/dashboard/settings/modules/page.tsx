import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { updateModuleDefinitionAction } from "@/modules/module-definitions/actions";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

export default async function ModuleDefinitionsPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") redirect("/dashboard");

  const modules = await getModuleCatalog();

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Sabit tanımlar</p>
          <h1 className={ui.pageTitle}>Modüller</h1>
          <p className={ui.pageDescription}>Uygulamadaki modüllerin kullanıcıya görünen adlarını ve açıklamalarını yönetin.</p>
        </div>
        <span className={ui.countBadge}>{modules.length} modül</span>
      </header>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div>
            <h2>Modül tanımları</h2>
            <p>Teknik kodlar sistem bağlantılarını korumak için değiştirilemez.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          {modules.map((module) => (
            <ActionForm key={module.key} action={updateModuleDefinitionAction} className={`${ui.formSection} ${styles.fullWidth}`}>
              <input type="hidden" name="key" value={module.key} />
              <div className={ui.sectionHeading}>
                <div>
                  <span className={ui.statusBadge}><Boxes size={14} /> {module.key}</span>
                  <h2>{module.name}</h2>
                </div>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Modül adı</span>
                  <input name="name" defaultValue={module.name} minLength={2} maxLength={100} required />
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Açıklama</span>
                  <textarea name="description" defaultValue={module.description} maxLength={500} rows={3} />
                </label>
                <div className={styles.fullWidthActionRow}>
                  <SubmitButton idleLabel="Kaydet" pendingLabel="Kaydediliyor..." className={ui.primaryAction} />
                </div>
              </div>
            </ActionForm>
          ))}
        </div>
      </section>
    </div>
  );
}
