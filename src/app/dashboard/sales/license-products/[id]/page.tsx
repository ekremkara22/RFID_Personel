import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { BackLink } from "@/app/dashboard/back-link";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { parseRouteId } from "@/lib/ids";
import { deleteLicenseProductAction } from "@/modules/commerce/actions";
import { getLicenseProduct, listShopierDigitalProducts } from "@/modules/commerce/repository";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { requireSalesAdmin, SalesPageHeader } from "../../sales-shared";
import { LicenseProductForm } from "../license-product-form";
import ui from "../../../management.module.css";

export default async function LicenseProductDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ products?: string }> }) {
  await requireSalesAdmin();
  const id = parseRouteId((await props.params).id);
  const loadProducts = (await props.searchParams).products === "1";
  const [product, catalog, shopier] = await Promise.all([
    getLicenseProduct(id),
    getModuleCatalog(),
    loadProducts ? listShopierDigitalProducts() : Promise.resolve({ products: [], error: null }),
  ]);
  if (!product) notFound();

  return (
    <div className={ui.managementPage}>
      <BackLink href="/dashboard/sales/license-products" label="Ürün eşlemelerine dön" />
      <SalesPageHeader
        title={product.title}
        description="Değişiklikler yalnız bundan sonra işlenecek siparişleri etkiler; açılmış lisanslar değişmez."
        actions={<Link className={ui.secondaryAction} href={`/dashboard/sales/license-products/${product.id}?products=1`}><RefreshCw size={15} />Shopier ürünlerini getir</Link>}
      />
      {shopier.error ? <div className={ui.notice} role="alert">{shopier.error}</div> : null}
      <section className={ui.surface}>
        <LicenseProductForm product={product} modules={catalog.map((item) => ({ key: item.key, name: item.name }))} shopierProducts={shopier.products} />
      </section>
      <section className={ui.dangerZone}>
        <div>
          <h3>Eşlemeyi sil</h3>
          <p>Silinen eşlemenin yeni siparişleri lisans açmaz. Geçmiş lisans kayıtları korunur; geçici durdurmak için pasif yapmanız önerilir.</p>
        </div>
        <ActionForm action={deleteLicenseProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <SubmitButton idleLabel="Eşlemeyi sil" pendingLabel="Siliniyor..." className={ui.dangerAction} icon={<Trash2 size={15} />} />
        </ActionForm>
      </section>
    </div>
  );
}
