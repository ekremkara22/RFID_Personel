/**
 * Shopier REST API v1 shapes used by the commerce module.
 * Source: https://developer.shopier.com/reference/ (Order, Product, Refund, Webhook models).
 * Only the fields this module reads are typed; every field is optional because the
 * payload comes from an external system and is validated during normalization.
 */

export type ShopierPersonInfo = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ShopierLineItem = {
  productId?: string | number | null;
  title?: string | null;
  type?: string | null; // physical | digital
  quantity?: number | string | null;
  price?: string | null;
  total?: string | null;
};

export type ShopierRefund = {
  id?: string | null;
  orderId?: string | number | null;
  type?: string | null; // full | partial
  status?: string | null; // pending | failed | succeeded
};

export type ShopierApiOrder = {
  id?: string | number | null;
  status?: string | null; // fulfilled | unfulfilled
  paymentStatus?: string | null; // paid | unpaid
  dateCreated?: string | null;
  currency?: string | null;
  totals?: { total?: string | number | null } | null;
  shippingInfo?: ShopierPersonInfo | null;
  billingInfo?: ShopierPersonInfo | null;
  lineItems?: ShopierLineItem[] | null;
  refunds?: ShopierRefund[] | null;
};

export type ShopierApiProduct = {
  id?: string | number | null;
  title?: string | null;
  type?: string | null; // physical | digital
  url?: string | null;
  description?: string | null;
  media?: { id?: string | null; type?: string | null; url?: string | null; placement?: number | string | null }[] | null;
  priceData?: {
    price?: string | number | null;
    currency?: string | null;
    vatPercent?: string | number | null;
    shippingPrice?: string | number | null;
  } | null;
  shippingPayer?: string | null; // buyerPays | sellerPays
  stockQuantity?: number | string | null;
  stockStatus?: string | null; // inStock | outOfStock
  dispatchDuration?: number | string | null;
};

export type ShopierApiWebhook = {
  id?: string | number | null;
  event?: string | null;
  url?: string | null;
  token?: string | null;
};

export const SHOPIER_LICENSE_WEBHOOK_EVENTS = ["order.created", "order.fulfilled", "refund.updated"] as const;
export type ShopierLicenseWebhookEvent = (typeof SHOPIER_LICENSE_WEBHOOK_EVENTS)[number];

export type ShopierOrderSource = "WEBHOOK" | "SYNC";
