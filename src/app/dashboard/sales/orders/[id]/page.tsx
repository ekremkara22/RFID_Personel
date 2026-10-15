import { notFound } from "next/navigation";
import { Truck } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { BackLink } from "@/app/dashboard/back-link";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { parseRouteId } from "@/lib/ids";
import { fulfillOrderAction } from "@/modules/commerce/actions";
import {
  fulfillmentStatusLabel,
  licenseStatusLabel,
  orderSourceLabel,
  paymentStatusLabel,
  refundStatusLabel,
  SHIPPING_COMPANY_LABELS,
  shipmentLabel,
  shippingCompanyLabel,
} from "@/modules/commerce/labels";
import { SHIPPING_COMPANIES } from "@/modules/commerce/product-rules";
import { getShopierOrderDetail } from "@/modules/commerce/repository";
import { Badge, formatDateTime, formatMoney, requireSalesAdmin, SalesPageHeader } from "../../sales-shared";
import ui from "../../../management.module.css";

function personName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string } | null) {
  if (!user) return "—";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || user.email;
}

export default async function SalesOrderDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireSalesAdmin();
  const order = await getShopierOrderDetail(parseRouteId((await props.params).id));
  if (!order) notFound();
  const payment = paymentStatusLabel(order.paymentStatus);
  const fulfillment = refundStatusLabel(order.refundStatus) ?? fulfillmentStatusLabel(order.status);
  const shipment = shipmentLabel(order);
  const canShip = shipment?.label === "Kargo bekliyor";

  return (
    <div className={ui.managementPage}>
      <BackLink href="/dashboard/sales/orders" label="Siparişlere dön" />
      <SalesPageHeader title={`Sipariş ${order.shopierOrderId}`} description={`${formatDateTime(order.orderedAt)} · ${order.buyerName ?? "İsimsiz alıcı"} · ${formatMoney(order.total, order.currency)}`} />

      <div className={ui.splitLayout}>
        <section className={ui.surface}>
          <div className={ui.sectionHeading}><div><h2>Sipariş durumu</h2><p>Shopier’den gelen son bilgi.</p></div></div>
          <dl className={ui.detailList}>
            <div className={ui.detailRow}><dt>Ödeme</dt><dd><Badge tone={payment.tone}>{payment.label}</Badge></dd></div>
            <div className={ui.detailRow}><dt>Teslimat / iade</dt><dd><Badge tone={fulfillment.tone}>{fulfillment.label}</Badge></dd></div>
            <div className={ui.detailRow}><dt>Kargo</dt><dd>{shipment ? <Badge tone={shipment.tone}>{shipment.label}</Badge> : "Dijital sipariş"}</dd></div>
            <div className={ui.detailRow}><dt>Alıcı e-postası</dt><dd>{order.buyerEmail ?? "—"}</dd></div>
            <div className={ui.detailRow}><dt>Kaynak</dt><dd>{orderSourceLabel(order.source)}</dd></div>
          </dl>
        </section>

        <section className={ui.surface}>
          <div className={ui.sectionHeading}><div><h2>Teslimat adresi</h2><p>Kargo etiketi için Shopier’deki adres.</p></div></div>
          {order.shipping ? (
            <dl className={ui.detailList}>
              <div className={ui.detailRow}><dt>Alıcı</dt><dd>{order.shipping.name}</dd></div>
              <div className={ui.detailRow}><dt>Telefon</dt><dd>{order.shipping.phone ?? "—"}</dd></div>
              <div className={ui.detailRow}><dt>Adres</dt><dd>{order.shipping.lines.join(", ") || "—"}</dd></div>
            </dl>
          ) : <p className={ui.secondaryText}>Adres bilgisi yok.</p>}
        </section>
      </div>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Ürünler</h2><p>Siparişteki satırlar.</p></div>
          <span className={ui.countBadge}>{order.lines.length} satır</span>
        </div>
        <dl className={ui.detailList}>
          {order.lines.length ? order.lines.map((line, index) => (
            <div key={`${line.productId}-${index}`} className={ui.detailRow}>
              <dt>{line.type === "physical" ? "Fiziksel" : line.type === "digital" ? "Dijital" : "Ürün"} · {line.quantity} adet</dt>
              <dd>{line.title}{line.total ? ` · ${formatMoney(line.total, order.currency)}` : ""}</dd>
            </div>
          )) : <p className={ui.secondaryText}>Ürün satırı bulunamadı.</p>}
        </dl>
        {order.licenses.length ? (
          <p className={ui.secondaryText}>Lisans satırları: {order.licenses.map((item) => licenseStatusLabel(item.status).label).join(", ")}</p>
        ) : null}
      </section>

      {order.hasPhysicalItems ? (
        <section className={ui.surface}>
          <div className={ui.sectionHeading}>
            <div><h2>Kargo bilgisi</h2><p>Gönderildi olarak işaretlenen sipariş Shopier’de kapatılır ve alıcıya takip numarası iletilir.</p></div>
          </div>
          {order.fulfilledAt ? (
            <dl className={ui.detailList}>
              <div className={ui.detailRow}><dt>Kargo firması</dt><dd>{shippingCompanyLabel(order.shippingCompany)}</dd></div>
              <div className={ui.detailRow}><dt>Takip numarası</dt><dd>{order.trackingNumber ?? "—"}</dd></div>
              <div className={ui.detailRow}><dt>Gönderim kaydı</dt><dd>{formatDateTime(order.fulfilledAt)} · {personName(order.fulfilledBy)}</dd></div>
            </dl>
          ) : canShip ? (
            <ActionForm action={fulfillOrderAction} className={ui.formShell}>
              <input type="hidden" name="id" value={order.id} />
              <div className={ui.formGrid}>
                <label className={ui.formField}>
                  <span>Kargo firması</span>
                  <select name="shippingCompany" required defaultValue="">
                    <option value="" disabled>Kargo firması seçin</option>
                    {SHIPPING_COMPANIES.map((company) => <option key={company} value={company}>{SHIPPING_COMPANY_LABELS[company]}</option>)}
                  </select>
                </label>
                <label className={ui.formField}>
                  <span>Takip numarası</span>
                  <input name="trackingNumber" required minLength={4} maxLength={64} pattern="[A-Za-z0-9\-]{4,64}" autoComplete="off" placeholder="ör. 1234567890" />
                </label>
              </div>
              <div className={ui.formActions}>
                <SubmitButton idleLabel="Gönderildi olarak işaretle" pendingLabel="Shopier’e gönderiliyor..." className={ui.primaryAction} icon={<Truck size={16} />} />
              </div>
            </ActionForm>
          ) : (
            <p className={ui.secondaryText}>
              {shipment?.label === "İade edildi"
                ? "Sipariş tam iade edildiği için kargoya verilemez."
                : shipment?.label === "Shopier’de kapatıldı"
                  ? "Sipariş Shopier panelinden kapatıldı; takip bilgisi Shopier’de."
                  : "Ödeme tamamlanınca kargo bilgisi girilebilir."}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
