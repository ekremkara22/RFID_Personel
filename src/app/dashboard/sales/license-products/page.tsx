import Link from "next/link";
import { PackageCheck, Plus, Search } from "lucide-react";

import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { durationLabel } from "@/modules/commerce/labels";
import { listLicenseProducts } from "@/modules/commerce/repository";
import { createModuleNameMap, getModuleCatalog } from "@/modules/module-definitions/repository";
import { requireSalesAdmin, SalesPageHeader } from "../sales-shared";
import ui from "../../management.module.css";

const columns: DataTableColumn[] = [
  { id: "product", label: "Shopier ürünü", valueKey: "title", secondaryKey: "shopierProductId", kind: "stack" },
  { id: "module", label: "Modül", valueKey: "moduleName" },
  { id: "duration", label: "Süre", valueKey: "duration" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export default async function LicenseProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSalesAdmin();
  const query = (await searchParams).q?.trim() ?? "";
  const [products, catalog] = await Promise.all([listLicenseProducts(), getModuleCatalog()]);
  const moduleNames = createModuleNameMap(catalog);
  const needle = query.toLocaleLowerCase("tr-TR");
  const rows = products
    .map((item) => ({
      id: item.id,
      title: item.title,
      shopierProductId: `Shopier no: ${item.shopierProductId}`,
      moduleName: moduleNames.get(item.moduleKey) ?? "Tanımsız modül",
      duration: durationLabel(item.durationDays),
      status: item.isActive ? "Aktif" : "Pasif",
      statusTone: item.isActive ? "success" : "warning",
      actionLabel: "İncele",
      actionHref: `/dashboard/sales/license-products/${item.id}`,
    }))
    .filter((row) => !needle || [row.title, row.shopierProductId, row.moduleName].some((value) => value.toLocaleLowerCase("tr-TR").includes(needle)));

  return (
    <div className={ui.managementPage}>
      <SalesPageHeader
        title="Ürün Eşlemeleri"
        description="Hangi Shopier ürününün hangi modül lisansını, ne kadar süreyle açacağını tanımlayın."
        actions={<Link className={ui.primaryAction} href="/dashboard/sales/license-products/new"><Plus size={16} />Yeni eşleme</Link>}
      />
      <section className={ui.surface} aria-label="Eşleme arama">
        <form className={`${ui.filterBar} ${ui.searchFilterBar}`}>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Eşleme ara</span>
            <span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Ürün adı, Shopier numarası veya modül" /></span>
          </label>
          <button className={ui.filterButton}>Ara</button>
        </form>
      </section>
      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Tanımlı eşlemeler</h2><p><PackageCheck size={14} /> Yalnız aktif eşlemeler yeni siparişlerde lisans açar.</p></div>
          <span className={ui.countBadge}>{rows.length} kayıt</span>
        </div>
        <ReorderableDataTable rows={rows} columns={columns} storageKey="sales-license-products-columns-v1" filename="shopier-urun-eslemeleri" emptyMessage={query ? "Aramanıza uygun eşleme bulunamadı." : "Henüz eşleme yok. Shopier'de sattığınız dijital ürünleri modüllerle eşleyin."} canExport minWidth={720} />
      </section>
    </div>
  );
}
