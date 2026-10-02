import {
  bandwidthHealthLevel,
  calculateMbps,
  latencyHealthLevel,
  overallHealthLevel,
  type HealthLevel,
} from "@/lib/server-health-rules";

const DOWNLOAD_BYTES = 5_000_000;
const UPLOAD_BYTES = 1_000_000;
const TEST_TIMEOUT_MS = 12_000;
const SUCCESS_CACHE_MS = 15 * 60 * 1000;
const FAILURE_CACHE_MS = 5 * 60 * 1000;
const DEFAULT_DOWNLOAD_URL = "https://speed.cloudflare.com/__down";
const DEFAULT_UPLOAD_URL = "https://speed.cloudflare.com/__up";

export type InternetSpeedSnapshot = {
  available: boolean;
  level: HealthLevel;
  latencyMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  measuredAt: Date;
  cachedUntil: Date;
};

type InternetSpeedCache = {
  value?: InternetSpeedSnapshot;
  expiresAt: number;
  pending?: Promise<InternetSpeedSnapshot>;
};

const globalSpeedCache = globalThis as typeof globalThis & {
  rfidInternetSpeedCache?: InternetSpeedCache;
};

function getDownloadUrl(bytes: number) {
  const url = new URL(process.env.SERVER_SPEED_TEST_DOWNLOAD_URL ?? DEFAULT_DOWNLOAD_URL);
  url.searchParams.set("bytes", String(bytes));
  url.searchParams.set("cacheBuster", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return url;
}

async function requireSuccessfulResponse(response: Response) {
  if (!response.ok) throw new Error(`Speed test request failed with ${response.status}.`);
  return response;
}

async function measureInternetSpeed(): Promise<InternetSpeedSnapshot> {
  const measuredAt = new Date();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

  try {
    const latencyStartedAt = performance.now();
    const latencyResponse = await fetch(getDownloadUrl(1), { cache: "no-store", signal: controller.signal });
    await (await requireSuccessfulResponse(latencyResponse)).arrayBuffer();
    const latencyMs = Math.max(0, Math.round(performance.now() - latencyStartedAt));

    const downloadStartedAt = performance.now();
    const downloadResponse = await fetch(getDownloadUrl(DOWNLOAD_BYTES), { cache: "no-store", signal: controller.signal });
    const downloadPayload = await (await requireSuccessfulResponse(downloadResponse)).arrayBuffer();
    const downloadMbps = calculateMbps(downloadPayload.byteLength, performance.now() - downloadStartedAt);

    const uploadPayload = new Uint8Array(UPLOAD_BYTES);
    const uploadStartedAt = performance.now();
    const uploadResponse = await fetch(process.env.SERVER_SPEED_TEST_UPLOAD_URL ?? DEFAULT_UPLOAD_URL, {
      method: "POST",
      body: uploadPayload,
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/octet-stream" },
    });
    await requireSuccessfulResponse(uploadResponse);
    const uploadMbps = calculateMbps(uploadPayload.byteLength, performance.now() - uploadStartedAt);

    const level = overallHealthLevel([
      latencyHealthLevel(latencyMs),
      bandwidthHealthLevel(downloadMbps, 10, 2),
      bandwidthHealthLevel(uploadMbps, 5, 1),
    ]);
    const cachedUntil = new Date(measuredAt.getTime() + SUCCESS_CACHE_MS);
    return { available: true, level, latencyMs, downloadMbps, uploadMbps, measuredAt, cachedUntil };
  } catch {
    const cachedUntil = new Date(measuredAt.getTime() + FAILURE_CACHE_MS);
    return {
      available: false,
      level: "critical",
      latencyMs: null,
      downloadMbps: null,
      uploadMbps: null,
      measuredAt,
      cachedUntil,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getInternetSpeedSnapshot() {
  const cache = globalSpeedCache.rfidInternetSpeedCache ?? { expiresAt: 0 };
  globalSpeedCache.rfidInternetSpeedCache = cache;

  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache.pending) return cache.pending;

  cache.pending = measureInternetSpeed().then((value) => {
    cache.value = value;
    cache.expiresAt = value.cachedUntil.getTime();
    cache.pending = undefined;
    return value;
  });
  return cache.pending;
}
