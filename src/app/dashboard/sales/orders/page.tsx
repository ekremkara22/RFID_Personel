import { RefreshCw, Search } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { syncShopierOrdersAction } from "@/modules/commerce/actions";
import { fulfillmentStatusLabel, orderLicenseSummary, orderSourceLabel, paymentStatusLabel, refundStatusLabel } from "@/modules/commerce/labels";
import { countLicenseQueue, listShopierOrders } from "@/modules/commerce/repository";
import { formatDateTime, formatMoney, requireSalesAdmin, SalesPageHeader } from "../sales-shared";
import ui from "../../management.module.css";

const columns: DataTableColumn[] = [
  { id: "date", label: "Tarih / sipariş no", valueKey: "orderedAt", secondaryKey: "orderNo", exportValueKey: "orderExport", kind: "stack" },
  { id: "buyer", label: "Alıcı", valueKey: "buyerName", secondaryKey: "buyerEmail", exportValueKey: "buyerExport", kind: "stack" },
  { id: "total", label: "Tutar", valueKey: "total" },
  { id: "payment", label: "Ödeme", valueKey: "payment", toneKey: "paymentTone", kind: "status" },
  { id: "fulfillment", label: "Teslimat / iade", valueKey: "fulfillment", toneKey: "fulfillmentTone", kind: "status" },
  { id: "license", label: "Lisans", valueKey: "license", toneKey: "licenseTone", kind: "status" },
  { id: "source", label: "Kaynak", valueKey: "source" },
];

function dayParam(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export default async function SalesOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; from?: string; to?: string }> }) {
  await requireSalesAdmin();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const from = dayParam(params.from);
  const to = dayParam(params.to);
  const [orders, queue] = await Promise.all([listShopierOrders({ q: query, from, to }), countLicenseQueue()]);

  const rows = orders.map((order) => {
    const payment = paymentStatusLabel(order.paymentStatus);
    const refund = refundStatusLabel(order.refundStatus);
    const fulfillment = refund ?? fulfillmentStatusLabel(order.status);
    const license = orderLicenseSummary(order.licenses.map((item) => item.status));
    return {
      id: order.id,
      orderedAt: formatDateTime(order.orderedAt),
      orderNo: `Sipariş no: ${order.shopierOrderId}`,
      buyerName: order.buyerName ?? "İsimsiz alıcı",
      buyerEmail: order.buyerEmail ?? "E-posta yok",
      // CSV export keeps both lines of the stacked cells (order no, buyer email).
      orderExport: `${formatDateTime(order.orderedAt)} – ${order.shopierOrderId}`,
      buyerExport: `${order.buyerName ?? "İsimsiz alıcı"} <${order.buyerEmail ?? "e-posta yok"}>`,
      total: formatMoney(order.total, order.currency),
      payment: payment.label,
      paymentTone: payment.tone,
      fulfillment: fulfillment.label,
      fulfillmentTone: fulfillment.tone,
      license: license.label,
      licenseTone: license.tone,
      source: orderSourceLabel(order.source),
    };
  });

  return (
    <div className={ui.managementPage}>
      <SalesPageHeader
        title="Siparişler"
        description="Shopier'den webhook veya elle eşitlemeyle gelen siparişler ve açılan lisanslar."
        actions={
          <ActionForm action={syncShopierOrdersAction} className={ui.toolbarActions}>
            <SubmitButton idleLabel="Şimdi eşitle" pendingLabel="Eşitleniyor..." className={ui.primaryAction} icon={<RefreshCw size={16} />} />
          </ActionForm>
        }
      />

      <div className={ui.summaryGrid}>
        <div className={ui.summaryCard}><p className={ui.summaryLabel}>Listelenen sipariş</p><p className={ui.summaryValue}>{orders.length}</p></div>
        <div className={ui.summaryCard}><p className={ui.summaryLabel}>Eşleşme bekleyen lisans</p><p className={ui.summaryValue}>{queue.pending}</p></div>
        <div className={ui.summaryCard}><p className={ui.summaryLabel}>İade edilen lisans</p><p className={ui.summaryValue}>{queue.refunded}</p></div>
      </div>

      <section className={ui.surface} aria-label="Sipariş filtreleri">
        <form className={ui.filterBar}>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Sipariş ara</span>
            <span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Sipariş no, alıcı adı veya e-posta" /></span>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Başlangıç</span>
            <input className={ui.control} type="date" name="from" defaultValue={from} />
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Bitiş</span>
            <input className={ui.control} type="date" name="to" defaultValue={to} />
          </label>
          <button className={ui.filterButton}>Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Shopier siparişleri</h2><p>En yeni 500 sipariş gösterilir. Eşitleme son 60 günün siparişlerini getirir; aynı sipariş iki kez lisans açmaz.</p></div>
          <span className={ui.countBadge}>{rows.length} kayıt</span>
        </div>
        <ReorderableDataTable rows={rows} columns={columns} storageKey="sales-orders-columns-v1" filename="shopier-siparisleri" emptyMessage={query || from || to ? "Filtrelere uygun sipariş bulunamadı." : "Henüz sipariş yok. Webhook kurulduysa yeni siparişler otomatik gelir; geçmiş siparişler için “Şimdi eşitle”yi kullanın."} canExport minWidth={1040} />
      </section>
    </div>
  );
}
