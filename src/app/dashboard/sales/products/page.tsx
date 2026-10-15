import Link from "next/link";
import { DownloadCloud, Plus, Search } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { importShopierProductsAction } from "@/modules/commerce/actions";
import { productStatusLabel } from "@/modules/commerce/labels";
import { productImagePath } from "@/modules/commerce/product-media";
import { listCommerceProducts } from "@/modules/commerce/repository";
import { formatDateTime, formatMoney, requireSalesAdmin, SalesPageHeader } from "../sales-shared";
import ui from "../../management.module.css";

const columns: DataTableColumn[] = [
  { id: "product", label: "Ürün", valueKey: "title", secondaryKey: "shopierNo", imageKey: "imageUrl", kind: "person" },
  { id: "price", label: "Fiyat", valueKey: "price" },
  { id: "stock", label: "Stok", valueKey: "stock" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "published", label: "Son yayın", valueKey: "publishedAt", secondaryKey: "publishNote", kind: "stack" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

const STATUS_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "DRAFT", label: "Taslak" },
  { value: "PUBLISHED", label: "Satışta" },
  { value: "ARCHIVED", label: "Arşivde" },
] as const;

export default async function SalesProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireSalesAdmin();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = STATUS_FILTERS.some((item) => item.value === params.status) ? params.status! : "";
  const products = await listCommerceProducts();
  const needle = query.toLocaleLowerCase("tr-TR");

  const rows = products
    .filter((item) => !status || item.status === status)
    .map((item) => {
      const badge = productStatusLabel(item.status);
      const image = item.images[0];
      return {
        id: item.id,
        title: item.title,
        shopierNo: item.shopierProductId ? `Shopier no: ${item.shopierProductId}` : "Shopier'de yok",
        imageUrl: image ? productImagePath(image) : null,
        price: formatMoney(item.price, item.currency),
        stock: item.stockQuantity === null ? "Sınırsız" : String(item.stockQuantity),
        status: badge.label,
        statusTone: badge.tone,
        publishedAt: formatDateTime(item.publishedAt),
        publishNote: item.publishError ? "Son gönderim başarısız" : item.publishedAt ? "Shopier'e gönderildi" : "Henüz gönderilmedi",
        actionLabel: "Düzenle",
        actionHref: `/dashboard/sales/products/${item.id}`,
      };
    })
    .filter((row) => !needle || [row.title, row.shopierNo].some((value) => value.toLocaleLowerCase("tr-TR").includes(needle)));

  const count = (value: string) => products.filter((item) => item.status === value).length;

  return (
    <div className={ui.managementPage}>
      <SalesPageHeader
        title="Ürünler"
        description="Fiziksel ürünleri panelde tanımlayın, görsellerini yükleyin ve Shopier'de yayınlayın."
        actions={
          <>
            <ActionForm action={importShopierProductsAction} className={ui.toolbarActions}>
              <SubmitButton idleLabel="Shopier'den içe aktar" pendingLabel="Aktarılıyor..." className={ui.secondaryAction} icon={<DownloadCloud size={16} />} />
            </ActionForm>
            <Link className={ui.primaryAction} href="/dashboard/sales/products/new"><Plus size={16} />Yeni ürün</Link>
          </>
        }
      />

      <div className={ui.summaryGrid}>
        <div className={ui.summaryCard}><p className={ui.summaryLabel}>Satışta</p><p className={ui.summaryValue}>{count("PUBLISHED")}</p></div>
        <div className={ui.summaryCard}><p className={ui.summaryLabel}>Taslak</p><p className={ui.summaryValue}>{count("DRAFT")}</p></div>
        <div className={ui.summaryCard}><p className={ui.summaryLabel}>Arşivde</p><p className={ui.summaryValue}>{count("ARCHIVED")}</p></div>
      </div>

      <section className={ui.surface} aria-label="Ürün filtreleri">
        <form className={`${ui.filterBar} ${ui.filterBarWide}`}>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Ürün ara</span>
            <span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Ürün adı veya Shopier numarası" /></span>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Durum</span>
            <select className={ui.control} name="status" defaultValue={status}>
              {STATUS_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <button className={ui.filterButton}>Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Ürün kataloğu</h2><p>Panel asıl kaynaktır: değişiklikler “Shopier'i güncelle” ile Shopier'e gönderilir. İçe aktarma yalnız katalogda olmayan ürünleri ekler.</p></div>
          <span className={ui.countBadge}>{rows.length} kayıt</span>
        </div>
        <ReorderableDataTable rows={rows} columns={columns} storageKey="sales-products-columns-v1" filename="fiziksel-urunler" emptyMessage={query || status ? "Filtrelere uygun ürün bulunamadı." : "Henüz ürün yok. Yeni ürün ekleyin veya Shopier'deki ürünleri içe aktarın."} canExport minWidth={900} />
      </section>
    </div>
  );
}
