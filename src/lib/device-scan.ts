const MAX_DEVICE_CLOCK_FUTURE_MS = 5 * 60 * 1000;
const MIN_DEVICE_SCAN_TIME_MS = Date.UTC(2024, 0, 1);

export type DeviceScanTimeResult =
  | { ok: true; scannedAt: Date; source: "device" | "server" }
  | { ok: false; error: string };

export function resolveDeviceScanTime(value: unknown, now = new Date()): DeviceScanTimeResult {
  if (value === undefined || value === null || value === "") {
    return { ok: true, scannedAt: now, source: "server" };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "Okutma zamani ISO tarih metni olmalidir." };
  }

  const scannedAt = new Date(value);
  if (Number.isNaN(scannedAt.getTime())) {
    return { ok: false, error: "Okutma zamani gecersiz." };
  }

  const difference = scannedAt.getTime() - now.getTime();
  if (difference > MAX_DEVICE_CLOCK_FUTURE_MS) {
    return { ok: false, error: "Cihaz saati sunucu saatinden ileri." };
  }
  if (scannedAt.getTime() < MIN_DEVICE_SCAN_TIME_MS) {
    return { ok: false, error: "Okutma zamani desteklenen tarih araligindan eski." };
  }

  return { ok: true, scannedAt, source: "device" };
}

export function normalizeClientEventId(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return /^[A-Za-z0-9:_-]{8,96}$/.test(normalized) ? normalized : "";
}
