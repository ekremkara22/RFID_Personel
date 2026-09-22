export const DEVICE_ONLINE_TIMEOUT_MS = 90_000;

export function isDeviceOnline(lastSeenAt: Date | null, now = Date.now()) {
  if (!lastSeenAt) return false;
  const age = now - lastSeenAt.getTime();
  return age >= 0 && age <= DEVICE_ONLINE_TIMEOUT_MS;
}
