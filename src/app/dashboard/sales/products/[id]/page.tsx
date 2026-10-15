import { notFound } from "next/navigation";
import { ExternalLink, Star, Trash2, UploadCloud, XCircle } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { BackLink } from "@/app/dashboard/back-link";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { parseRouteId } from "@/lib/ids";
import { deleteProductAction, makePrimaryProductImageAction, publishProductAction, removeProductImageAction, unpublishProductAction } from "@/modules/commerce/actions";
import { productStatusLabel } from "@/modules/commerce/labels";
import { productImagePath } from "@/modules/commerce/product-media";
import { getCommerceProduct } from "@/modules/commerce/repository";
import { Badge, formatDateTime, requireSalesAdmin, SalesPageHeader } from "../../sales-shared";
import { ProductForm } from "../product-form";
import ui from "../../../management.module.css";

export default async function ProductDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireSalesAdmin();
  const id = parseRouteId((await props.params).id);
  const product = await getCommerceProduct(id);
  if (!product) notFound();
  const status = productStatusLabel(product.status);
  const linked = !!product.shopierProductId;

  return (
    <div className={ui.managementPage}>
      <BackLink href="/dashboard/sales/products" label="Ürünlere dön" />
      <SalesPageHeader
        title={product.title}
        description={linked ? "Paneldeki değişiklikler “Shopier’i güncelle” ile Shopier’deki ürüne yazılır." : "Ürün henüz Shopier’de değil. Bilgileri ve görselleri kontrol edip yayınlayın."}
        actions={
          <ActionForm action={publishProductAction} className={ui.toolbarActions}>
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton idleLabel={linked ? "Shopier’i güncelle" : "Shopier’de yayınla"} pendingLabel="Gönderiliyor..." className={ui.primaryAction} icon={<UploadCloud size={16} />} />
          </ActionForm>
        }
      />

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Shopier durumu</h2><p>Görseller Shopier’e bu sunucunun herkese açık adresinden gönderilir.</p></div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <dl className={ui.detailList}>
          <div className={ui.detailRow}><dt>Shopier ürün no</dt><dd>{product.shopierProductId ?? "—"}</dd></div>
          <div className={ui.detailRow}><dt>Son gönderim</dt><dd>{formatDateTime(product.publishedAt)}</dd></div>
          {product.shopierUrl ? <div className={ui.detailRow}><dt>Ürün sayfası</dt><dd><a href={product.shopierUrl} target="_blank" rel="noreferrer">Shopier’de aç <ExternalLink size={13} /></a></dd></div> : null}
          {product.publishError ? <div className={ui.detailRow}><dt>Son hata</dt><dd role="alert">{product.publishError}</dd></div> : null}
        </dl>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Görseller</h2><p>Shopier en fazla 5 görsel kabul eder; ilk görsel ana görseldir. Değişiklikler Shopier’e güncellemeyle yansır.</p></div>
          <span className={ui.countBadge}>{product.images.length} / 5</span>
        </div>
        {product.images.length ? (
          <div className={ui.mediaGrid}>
            {product.images.map((image, index) => {
              const src = productImagePath(image);
              return (
                <div key={image.id} className={ui.mediaCard}>
                  <div className={ui.mediaThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {src ? <img src={src} alt={`${product.title} görsel ${index + 1}`} loading="lazy" /> : null}
                    {index === 0 ? <span className={ui.mediaTag}>Ana görsel</span> : null}
                  </div>
                  <div className={ui.mediaActions}>
                    {index > 0 ? (
                      <ActionForm action={makePrimaryProductImageAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="imageId" value={image.id} />
                        <SubmitButton idleLabel="Ana yap" pendingLabel="..." className={`${ui.secondaryAction} ${ui.compactAction}`} icon={<Star size={14} />} />
                      </ActionForm>
                    ) : null}
                    <ActionForm action={removeProductImageAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="imageId" value={image.id} />
                      <SubmitButton idleLabel="Kaldır" pendingLabel="..." className={`${ui.dangerAction} ${ui.compactAction}`} icon={<Trash2 size={14} />} />
                    </ActionForm>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={ui.mediaPlaceholder}>Görsel yok. Shopier’de yayınlamak için aşağıdan en az bir görsel ekleyin.</div>
        )}
      </section>

      <ProductForm product={{ ...product, imageCount: product.images.length }} />

      <section className={ui.dangerZone}>
        {linked ? (
          <>
            <div>
              <h3>Shopier’den kaldır</h3>
              <p>Ürün Shopier’den silinir ve satış durur. Paneldeki kayıt arşivlenir; tekrar yayınlanırsa Shopier’de yeni ürün olarak açılır.</p>
            </div>
            <ActionForm action={unpublishProductAction}>
              <input type="hidden" name="id" value={product.id} />
              <SubmitButton idleLabel="Shopier’den kaldır" pendingLabel="Kaldırılıyor..." className={ui.dangerAction} icon={<XCircle size={15} />} />
            </ActionForm>
          </>
        ) : (
          <>
            <div>
              <h3>Ürünü sil</h3>
              <p>Ürün ve görselleri panelden kalıcı olarak silinir. Shopier’de yayında olmadığı için mağazayı etkilemez.</p>
            </div>
            <ActionForm action={deleteProductAction}>
              <input type="hidden" name="id" value={product.id} />
              <SubmitButton idleLabel="Ürünü sil" pendingLabel="Siliniyor..." className={ui.dangerAction} icon={<Trash2 size={15} />} />
            </ActionForm>
          </>
        )}
      </section>
    </div>
  );
}
