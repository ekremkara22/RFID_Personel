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

export function durationLabel(durationDays: number | null, quantity = 1) {
  if (durationDays === null) return "Süresiz";
  const total = durationDays * Math.max(quantity, 1);
  return quantity > 1 ? `${total} gün (${quantity} × ${durationDays})` : `${total} gün`;
}
