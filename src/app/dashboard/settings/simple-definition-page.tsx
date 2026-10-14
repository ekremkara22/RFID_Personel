import { Plus, Save, Trash2 } from "lucide-react";
import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import type { ActionResult } from "@/lib/action-error";
import styles from "../page.module.css";
import ui from "../management.module.css";

type FormAction = (data: FormData) => Promise<ActionResult | void>;

export type SimpleDefinitionItem = { id: number; name: string; isActive: boolean; usage: number };

/**
 * Shared layout for one-field company definitions (Pozisyonlar, Departman Kategorileri):
 * a compact create form followed by inline-editable rows, so each list behaves the same.
 */
export function SimpleDefinitionPage({ title, description, placeholder, usageLabel, items, createAction, updateAction, deleteAction }: {
  title: string;
  description: string;
  placeholder: string;
  usageLabel: string;
  items: SimpleDefinitionItem[];
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
}) {
  const activeCount = items.filter((item) => item.isActive).length;
  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Sabit tanımlar</p>
          <h1 className={ui.pageTitle}>{title}</h1>
          <p className={ui.pageDescription}>{description}</p>
        </div>
        <span className={ui.countBadge}>{activeCount} aktif</span>
      </header>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Yeni kayıt</h2><p>Kaydedilen değer personel ve departman formlarında seçilebilir hâle gelir.</p></div></div>
        <ActionForm action={createAction} className={ui.definitionCreate}>
          <label className={ui.formField}><span>Ad</span><input name="name" required minLength={2} maxLength={100} placeholder={placeholder} /></label>
          <SubmitButton idleLabel="Ekle" pendingLabel="Ekleniyor..." className={ui.primaryAction} icon={<Plus size={16} />} />
        </ActionForm>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Kayıtlar</h2><p>Kullanımda olan kayıtlar silinemez; pasif yapıldığında yeni seçimlerde görünmez.</p></div><span className={ui.countBadge}>{items.length} kayıt</span></div>
        {items.length === 0 ? <p className={ui.emptyState}>Henüz kayıt yok. Yukarıdaki formdan ilk kaydı ekleyin.</p> : (
          <ul className={ui.definitionList}>
            {items.map((item) => (
              <li key={item.id} className={ui.definitionRow}>
                <ActionForm action={updateAction} className={ui.definitionEdit}>
                  <input type="hidden" name="id" value={item.id} />
                  <label className={ui.formField}><span className={ui.srOnly}>{item.name} adı</span><input name="name" defaultValue={item.name} required minLength={2} maxLength={100} aria-label={`${item.name} adı`} /></label>
                  <span className={ui.definitionMeta}>{item.usage} {usageLabel}</span>
                  <label className={ui.checkField}><input name="isActive" type="checkbox" defaultChecked={item.isActive} />Aktif</label>
                  <SubmitButton idleLabel="Kaydet" pendingLabel="Kaydediliyor..." className={ui.rowAction} icon={<Save size={15} />} />
                </ActionForm>
                <ActionForm action={deleteAction} className={ui.definitionDelete}>
                  <input type="hidden" name="id" value={item.id} />
                  <SubmitButton idleLabel="Sil" pendingLabel="Siliniyor..." className={ui.dangerAction} icon={<Trash2 size={15} />} ariaLabel={`${item.name} kaydını sil`} disabled={item.usage > 0} />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
