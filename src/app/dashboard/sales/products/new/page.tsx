import { BackLink } from "@/app/dashboard/back-link";
import { requireSalesAdmin, SalesPageHeader } from "../../sales-shared";
import { ProductForm } from "../product-form";
import ui from "../../../management.module.css";

export default async function NewProductPage() {
  await requireSalesAdmin();
  return (
    <div className={ui.managementPage}>
      <BackLink href="/dashboard/sales/products" label="Ürünlere dön" />
      <SalesPageHeader title="Yeni ürün" description="Ürün önce taslak olarak kaydedilir; görselleri kontrol ettikten sonra Shopier'de yayınlayın." />
      <ProductForm />
    </div>
  );
}
