import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { saveLicenseProductAction } from "@/modules/commerce/actions";
import ui from "../../management.module.css";

type Props = {
  product?: { id: number; shopierProductId: string; title: string; moduleKey: string; durationDays: number | null; isActive: boolean };
  modules: { key: string; name: string }[];
  shopierProducts: { id: string; title: string; price: string | null }[];
};

/** Shared create/edit form for Shopier product -> module license mappings. */
export function LicenseProductForm({ product, modules, shopierProducts }: Props) {
  const listId = "shopier-digital-products";
  return (
    <ActionForm action={saveLicenseProductAction} className={ui.formShell}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}>
          <h2>Shopier ürünü</h2>
          <p>{shopierProducts.length ? "Listeden dijital bir ürün seçin veya ürün numarasını elle girin." : "Shopier panelindeki ürün numarasını girin."}</p>
        </div>
        <div className={ui.formGrid}>
          <label className={ui.formField}>
            <span>Shopier ürün numarası</span>
            <input name="shopierProductId" required maxLength={64} pattern="[A-Za-z0-9_\-]{1,64}" defaultValue={product?.shopierProductId ?? ""} list={shopierProducts.length ? listId : undefined} placeholder="ör. 12345678" autoComplete="off" />
          </label>
          <label className={ui.formField}>
            <span>Ürün adı</span>
            <input name="title" required minLength={2} maxLength={200} defaultValue={product?.title ?? ""} placeholder="ör. Üretim Planlama – 1 yıllık lisans" />
          </label>
          {shopierProducts.length ? (
            <datalist id={listId}>
              {shopierProducts.map((item) => <option key={item.id} value={item.id}>{item.title}{item.price ? ` · ${item.price}` : ""}</option>)}
            </datalist>
          ) : null}
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}>
          <h2>Açılacak lisans</h2>
          <p>Süre boş bırakılırsa süresiz lisans verilir. Süreli alımlar mevcut aktif bitiş tarihine eklenir.</p>
        </div>
        <div className={ui.formGrid}>
          <label className={ui.formField}>
            <span>Modül</span>
            <select name="moduleKey" required defaultValue={product?.moduleKey ?? ""}>
              <option value="" disabled>Modül seçin</option>
              {modules.map((module) => <option key={module.key} value={module.key}>{module.name}</option>)}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Süre (gün)</span>
            <input name="durationDays" type="number" min={1} max={3650} step={1} inputMode="numeric" defaultValue={product?.durationDays ?? ""} placeholder="Boş = süresiz" />
          </label>
          <label className={ui.checkField}>
            <input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true} />
            Aktif (yeni siparişler lisans açar)
          </label>
        </div>
      </section>

      <div className={ui.formActions}>
        <SubmitButton idleLabel={product ? "Değişiklikleri kaydet" : "Eşlemeyi kaydet"} pendingLabel="Kaydediliyor..." className={ui.primaryAction} />
      </div>
    </ActionForm>
  );
}
