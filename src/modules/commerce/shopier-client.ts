import "server-only";

import { ActionError } from "@/lib/action-error";
import { getCredential, SHOPIER_API_TOKEN_KEY, SHOPIER_PROVIDER } from "./credentials";
import { formatShopierDate } from "./license-rules";
import type { ShopierApiOrder, ShopierApiProduct, ShopierApiWebhook } from "./shopier-types";

/**
 * Minimal fetch-based Shopier REST API v1 client (https://developer.shopier.com/reference/).
 * Errors are ActionError with Turkish text and never contain the token or response body secrets.
 */
const BASE_URL = "https://api.shopier.com/v1/";
const PAGE_LIMIT = 50;
const MAX_PAGES = 200;
const DEFAULT_TIMEOUT_MS = 10_000;

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  timeoutMs?: number;
};

function statusMessage(status: number, detail: string | null) {
  if (status === 401 || status === 403) return "Shopier API anahtarı geçersiz veya bu işlem için yetkisi yok. Entegrasyon ayarlarından anahtarı kontrol edin.";
  if (status === 404) return "Shopier'de istenen kayıt bulunamadı.";
  if (status === 429) return "Shopier istek limiti aşıldı. Birkaç dakika sonra tekrar deneyin.";
  if (status >= 500) return `Shopier şu anda yanıt vermiyor (HTTP ${status}). Daha sonra tekrar deneyin.`;
  return `Shopier isteği reddetti (HTTP ${status})${detail ? `: ${detail}` : "."}`;
}

/** Short, printable error text from Shopier's JSON error body; never echoes headers. */
async function errorDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as Record<string, unknown> | null;
    const message = data && (data.message ?? data.error);
    return typeof message === "string" ? message.replace(/[^\p{L}\p{N}\s.,:;'"()/_-]/gu, "").slice(0, 200) || null : null;
  } catch {
    return null;
  }
}

export function createShopierClient(token: string) {
  if (!token) throw new ActionError("Shopier API anahtarı tanımlı değil. Önce Entegrasyonlar sayfasından anahtarı kaydedin.");

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), BASE_URL);
    for (const [name, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
    }
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      const name = error && typeof error === "object" && "name" in error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") throw new ActionError("Shopier'e bağlanırken zaman aşımı oluştu. Daha sonra tekrar deneyin.");
      throw new ActionError("Shopier'e bağlanılamadı. Sunucunun internet bağlantısını kontrol edin.");
    }
    if (!response.ok) throw new ActionError(statusMessage(response.status, await errorDetail(response)));
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ActionError("Shopier beklenmeyen biçimde yanıt verdi.");
    }
  }

  /** Lists are plain arrays without page metadata; a page shorter than the limit is the last one. */
  async function listAll<T>(path: string, query: RequestOptions["query"] = {}, timeoutMs?: number): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const batch = await request<T[]>(path, { query: { ...query, limit: PAGE_LIMIT, page }, timeoutMs });
      if (!Array.isArray(batch)) throw new ActionError("Shopier liste yanıtı beklenen biçimde değil.");
      items.push(...batch);
      if (batch.length < PAGE_LIMIT) return items;
    }
    return items;
  }

  return {
    /** Without dates Shopier returns the last 60 days. */
    listOrders(range: { dateStart?: Date; dateEnd?: Date } = {}) {
      return listAll<ShopierApiOrder>("orders", {
        dateStart: range.dateStart ? formatShopierDate(range.dateStart) : undefined,
        dateEnd: range.dateEnd ? formatShopierDate(range.dateEnd) : undefined,
        sort: "dateAsc",
      });
    },
    getOrder(id: string, timeoutMs?: number) {
      return request<ShopierApiOrder>(`orders/${encodeURIComponent(id)}`, { timeoutMs });
    },
    listProducts() {
      return listAll<ShopierApiProduct>("products");
    },
    /** First page only; used as a cheap connection test. */
    async testConnection() {
      await request<ShopierApiProduct[]>("products", { query: { limit: 1, page: 1 } });
    },
    /** The returned token exists only in this response and must be stored immediately. */
    createWebhook(event: string, url: string) {
      return request<ShopierApiWebhook>("webhooks", { method: "POST", body: { event, url } });
    },
    async listWebhooks() {
      const webhooks = await request<ShopierApiWebhook[]>("webhooks");
      return Array.isArray(webhooks) ? webhooks : [];
    },
    async deleteWebhook(id: string) {
      await request<unknown>(`webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
}

export type ShopierClient = ReturnType<typeof createShopierClient>;

export async function getShopierClient(): Promise<ShopierClient> {
  const token = await getCredential(SHOPIER_PROVIDER, SHOPIER_API_TOKEN_KEY);
  if (!token) throw new ActionError("Shopier API anahtarı tanımlı değil. Önce Entegrasyonlar sayfasından anahtarı kaydedin.");
  return createShopierClient(token);
}
