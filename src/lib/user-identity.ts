export function normalizeOptionalUsername(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function isValidOptionalUsername(username: string | null) {
  return username === null || /^[a-z0-9._-]{3,64}$/.test(username);
}
