import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { BackLink } from "@/app/dashboard/back-link";
import { listShopierDigitalProducts } from "@/modules/commerce/repository";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { requireSalesAdmin, SalesPageHeader } from "../../sales-shared";
import { LicenseProductForm } from "../license-product-form";
import ui from "../../../management.module.css";

export default async function NewLicenseProductPage({ searchParams }: { searchParams: Promise<{ products?: string }> }) {
  await requireSalesAdmin();
  // Shopier is only queried on request so the form opens instantly even when the API is slow.
  const loadProducts = (await searchParams).products === "1";
  const [catalog, shopier] = await Promise.all([
    getModuleCatalog(),
    loadProducts ? listShopierDigitalProducts() : Promise.resolve({ products: [], error: null }),
  ]);

  return (
    <div className={ui.managementPage}>
      <BackLink href="/dashboard/sales/license-products" label="Ürün eşlemelerine dön" />
      <SalesPageHeader
        title="Yeni ürün eşlemesi"
        description="Shopier'de satılan dijital ürünün ödenen siparişlerinde açılacak modül lisansını tanımlayın."
        actions={<Link className={ui.secondaryAction} href="/dashboard/sales/license-products/new?products=1"><RefreshCw size={15} />Shopier ürünlerini getir</Link>}
      />
      {shopier.error ? <div className={ui.notice} role="alert">{shopier.error} Ürün numarasını elle girebilirsiniz.</div> : null}
      {loadProducts && !shopier.error ? <div className={ui.notice} role="status">{shopier.products.length ? `${shopier.products.length} dijital ürün bulundu; ürün numarası alanında listeden seçebilirsiniz.` : "Shopier mağazanızda dijital ürün bulunamadı."}</div> : null}
      <section className={ui.surface}>
        <LicenseProductForm modules={catalog.map((item) => ({ key: item.key, name: item.name }))} shopierProducts={shopier.products} />
      </section>
    </div>
  );
}
