import { SubmitButton } from "@/app/dashboard/submit-button";
import ui from "../../management.module.css";

type Category = { id: number; name: string; isActive: boolean };

/** Shared create/edit fields so both department screens stay identical. */
export function DepartmentFormFields({ categories, name, categoryId, isActive, submitLabel }: {
  categories: Category[];
  name?: string;
  categoryId?: number | null;
  isActive?: boolean;
  submitLabel: string;
}) {
  const options = categories.filter((item) => item.isActive || item.id === categoryId);
  return (
    <>
      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}><h2>Departman bilgileri</h2><p>Kategori, bütçe raporunda departmanları üst gruplarda toplar.</p></div>
        <div className={ui.formGrid}>
          <label className={ui.formField}><span>Departman adı</span><input name="name" defaultValue={name} required maxLength={191} placeholder="Üretim, Depo, Muhasebe..." /></label>
          <label className={ui.formField}><span>Departman kategorisi</span><select name="categoryId" defaultValue={categoryId ?? ""}><option value="">Kategori seçilmedi</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (pasif)"}</option>)}</select></label>
          {isActive !== undefined ? <label className={ui.checkField}><input name="isActive" type="checkbox" defaultChecked={isActive} />Departman aktif</label> : null}
        </div>
        {categories.length === 0 ? <p className={ui.helpText}>Henüz kategori yok. Sabit Tanımlar → Departman Kategorileri ekranından ekleyebilirsiniz.</p> : null}
      </section>
      <div className={ui.formActions}><SubmitButton idleLabel={submitLabel} pendingLabel="Kaydediliyor..." className={ui.primaryAction} /></div>
    </>
  );
}
