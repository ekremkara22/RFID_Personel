import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { saveProductAction } from "@/modules/commerce/actions";
import { SHIPPING_PAYER_LABELS } from "@/modules/commerce/labels";
import { MAX_PRODUCT_IMAGES, PRODUCT_CURRENCIES, PRODUCT_VAT_PERCENTS, SHIPPING_PAYERS } from "@/modules/commerce/product-rules";
import ui from "../../management.module.css";

type Amount = { toString(): string };
type Props = {
  product?: {
    id: number;
    title: string;
    description: string | null;
    price: Amount;
    currency: string;
    vatPercent: number | null;
    shippingPayer: string;
    shippingPrice: Amount | null;
    stockQuantity: number | null;
    dispatchDuration: number;
    updatedAt: Date;
    imageCount: number;
  };
};

/** "1250.50" -> "1250,50" for the Turkish money inputs. */
function moneyValue(value: Amount | null | undefined) {
  return value === null || value === undefined ? "" : Number(value.toString()).toFixed(2).replace(".", ",");
}

/** Shared create/edit form for physical products; new images are appended after the existing ones. */
export function ProductForm({ product }: Props) {
  const remaining = MAX_PRODUCT_IMAGES - (product?.imageCount ?? 0);
  return (
    <ActionForm action={saveProductAction} className={ui.formShell}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}>
          <h2>Ürün bilgileri</h2>
          <p>Başlık ve açıklama Shopier ürün sayfasında aynen görünür.</p>
        </div>
        <div className={ui.formGrid}>
          <label className={`${ui.formField} ${ui.formFullWidth}`}>
            <span>Ürün adı</span>
            <input name="title" required minLength={2} maxLength={200} defaultValue={product?.title ?? ""} placeholder="ör. LED oyun logosu – 40 cm" />
          </label>
          <label className={`${ui.formField} ${ui.formFullWidth}`}>
            <span>Açıklama</span>
            <textarea name="description" maxLength={20000} rows={6} defaultValue={product?.description ?? ""} placeholder="Ölçüler, malzeme, kutu içeriği..." />
          </label>
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}>
          <h2>Fiyat ve stok</h2>
          <p>Stok boş bırakılırsa Shopier’e stok adedi gönderilmez.</p>
        </div>
        <div className={ui.formGridThree}>
          <label className={ui.formField}>
            <span>Fiyat</span>
            <input name="price" required inputMode="decimal" defaultValue={moneyValue(product?.price)} placeholder="ör. 1250,00" />
          </label>
          <label className={ui.formField}>
            <span>Para birimi</span>
            <select name="currency" defaultValue={product?.currency ?? "TRY"}>
              {PRODUCT_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </label>
          <label className={ui.formField}>
            <span>KDV oranı</span>
            <select name="vatPercent" defaultValue={product?.vatPercent ?? ""}>
              <option value="">Shopier varsayılanı</option>
              {PRODUCT_VAT_PERCENTS.map((vat) => <option key={vat} value={vat}>%{vat}</option>)}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Stok adedi</span>
            <input name="stockQuantity" type="number" min={0} max={1000000} step={1} inputMode="numeric" defaultValue={product?.stockQuantity ?? ""} placeholder="Boş = takip edilmez" />
          </label>
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}>
          <h2>Kargo</h2>
          <p>Kargo ücreti yalnız alıcı öderse kullanılır. Kargoya veriliş süresi 1–3 gündür.</p>
        </div>
        <div className={ui.formGridThree}>
          <label className={ui.formField}>
            <span>Kargo ücretini</span>
            <select name="shippingPayer" required defaultValue={product?.shippingPayer ?? "buyerPays"}>
              {SHIPPING_PAYERS.map((payer) => <option key={payer} value={payer}>{SHIPPING_PAYER_LABELS[payer]}</option>)}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Kargo ücreti</span>
            <input name="shippingPrice" inputMode="decimal" defaultValue={moneyValue(product?.shippingPrice)} placeholder="Boş = Shopier ayarı" />
          </label>
          <label className={ui.formField}>
            <span>Kargoya veriliş (gün)</span>
            <select name="dispatchDuration" defaultValue={product?.dispatchDuration ?? 1}>
              {[1, 2, 3].map((day) => <option key={day} value={day}>{day} gün</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className={ui.formSection}>
        <div className={ui.formSectionHeader}>
          <h2>Görsel ekle</h2>
          <p>{remaining > 0 ? `JPG veya PNG, her biri en fazla 2 MB. Bu ürüne ${remaining} görsel daha eklenebilir; ilk görsel ana görseldir.` : `Ürünün ${MAX_PRODUCT_IMAGES} görseli var. Yeni görsel için önce birini kaldırın.`}</p>
        </div>
        {/* Keyed by updatedAt so the picker is emptied after a successful save (no duplicate uploads). */}
        <label key={product?.updatedAt.getTime() ?? "new"} className={ui.formField}>
          <span>Görseller</span>
          <input name="images" type="file" accept="image/jpeg,image/png" multiple disabled={remaining <= 0} />
        </label>
      </section>

      <div className={ui.formActions}>
        {/* On the edit page "Shopier’de yayınla" is the primary action; saving is secondary there. */}
        <SubmitButton idleLabel={product ? "Değişiklikleri kaydet" : "Ürünü kaydet"} pendingLabel="Kaydediliyor..." className={product ? ui.secondaryAction : ui.primaryAction} />
      </div>
    </ActionForm>
  );
}
