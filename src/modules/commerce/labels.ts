/** Turkish labels and badge tones for Shopier/licensing codes; pages never show raw codes. */
export type BadgeTone = "success" | "warning" | "danger" | "neutral";
type Label = { label: string; tone: BadgeTone };

const PAYMENT: Record<string, Label> = {
  paid: { label: "Ödendi", tone: "success" },
  unpaid: { label: "Ödenmedi", tone: "warning" },
};

const FULFILLMENT: Record<string, Label> = {
  fulfilled: { label: "Teslim edildi", tone: "success" },
  unfulfilled: { label: "Teslim bekliyor", tone: "neutral" },
};

const REFUND: Record<string, Label> = {
  full: { label: "Tam iade", tone: "danger" },
  partial: { label: "Kısmi iade", tone: "warning" },
  pending: { label: "İade talebi", tone: "warning" },
  failed: { label: "İade başarısız", tone: "neutral" },
};

const LICENSE: Record<string, Label> = {
  PENDING_MATCH: { label: "Eşleşme bekliyor", tone: "warning" },
  ACTIVATED: { label: "Lisans açıldı", tone: "success" },
  REFUNDED: { label: "İade edildi", tone: "danger" },
  IGNORED: { label: "Yok sayıldı", tone: "neutral" },
};

const SOURCE: Record<string, string> = { WEBHOOK: "Anlık bildirim", SYNC: "Elle eşitleme" };

const WEBHOOK_EVENT: Record<string, string> = {
  "order.created": "Sipariş oluşturuldu",
  "order.fulfilled": "Sipariş teslim edildi",
  "refund.updated": "İade güncellendi",
};

const unknown = (value: string | null | undefined): Label => ({ label: value ? "Bilinmiyor" : "—", tone: "neutral" });

export const paymentStatusLabel = (value: string | null | undefined) => (value && PAYMENT[value]) || unknown(value);
export const fulfillmentStatusLabel = (value: string | null | undefined) => (value && FULFILLMENT[value]) || unknown(value);
export const refundStatusLabel = (value: string | null | undefined) => (value && REFUND[value]) || null;
export const licenseStatusLabel = (value: string | null | undefined) => (value && LICENSE[value]) || unknown(value);
export const orderSourceLabel = (value: string | null | undefined) => (value && SOURCE[value]) || "—";
export const webhookEventLabel = (value: string) => WEBHOOK_EVENT[value] ?? "Diğer olay";

/** One summary badge for all license rows of an order. */
export function orderLicenseSummary(statuses: readonly string[]): Label & { detail: string | null } {
  if (statuses.length === 0) return { label: "Lisans yok", tone: "neutral", detail: null };
  const count = (status: string) => statuses.filter((item) => item === status).length;
  const detail = `${statuses.length} lisans satırı`;
  if (count("PENDING_MATCH")) return { ...LICENSE.PENDING_MATCH, detail };
  if (count("REFUNDED")) return { ...LICENSE.REFUNDED, detail };
  if (count("ACTIVATED")) return { ...LICENSE.ACTIVATED, detail };
  return { ...LICENSE.IGNORED, detail };
}

const PRODUCT_STATUS: Record<string, Label> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  PUBLISHED: { label: "Shopier'de satışta", tone: "success" },
  ARCHIVED: { label: "Arşivde", tone: "warning" },
};

export const SHIPPING_COMPANY_LABELS: Record<string, string> = {
  yurtici: "Yurtiçi Kargo",
  mng: "MNG Kargo",
  ptt: "PTT Kargo",
  aras: "Aras Kargo",
  surat: "Sürat Kargo",
  ups: "UPS",
  fedex: "FedEx",
  dhl: "DHL",
  tnt: "TNT",
  pts: "PTS",
  aramex: "Aramex",
  interGlobal: "InterGlobal",
  hepsijet: "HepsiJET",
  other: "Diğer",
};

export const SHIPPING_PAYER_LABELS: Record<string, string> = { buyerPays: "Alıcı öder", sellerPays: "Satıcı öder (ücretsiz kargo)" };

export const productStatusLabel = (value: string | null | undefined) => (value && PRODUCT_STATUS[value]) || unknown(value);
export const shippingCompanyLabel = (value: string | null | undefined) => (value && SHIPPING_COMPANY_LABELS[value]) || "—";

/** Shipment badge for physical orders; null for orders without physical items. */
export function shipmentLabel(order: { hasPhysicalItems: boolean; status: string; paymentStatus: string; refundStatus: string | null; fulfilledAt: Date | null }): Label | null {
  if (!order.hasPhysicalItems) return null;
  if (order.fulfilledAt) return { label: "Kargoya verildi", tone: "success" };
  // Closed directly in the Shopier panel: no tracking info here, but nothing left to ship.
  if (order.status === "fulfilled") return { label: "Shopier'de kapatıldı", tone: "success" };
  if (order.refundStatus === "full") return { label: "İade edildi", tone: "danger" };
  if (order.paymentStatus !== "paid") return { label: "Ödeme bekliyor", tone: "neutral" };
  return { label: "Kargo bekliyor", tone: "warning" };
}

export function durationLabel(durationDays: number | null, quantity = 1) {
  if (durationDays === null) return "Süresiz";
  const total = durationDays * Math.max(quantity, 1);
  return quantity > 1 ? `${total} gün (${quantity} × ${durationDays})` : `${total} gün`;
}
