/** Best-effort per-process throttle keyed by client IP; enough to slow scripted bursts without extra infrastructure. */
export function createIpRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return function isRateLimited(request: Request, now = Date.now()) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const entry = attempts.get(ip);
    if (!entry || entry.resetAt <= now) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      if (attempts.size > 5000) {
        for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
      }
      return false;
    }
    entry.count += 1;
    return entry.count > maxAttempts;
  };
}

export function normalizedEmail(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 191).toLowerCase() : "";
}
