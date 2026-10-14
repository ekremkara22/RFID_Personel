import { createHmac, timingSafeEqual } from "node:crypto";

const HEX_SHA256 = /^[0-9a-f]{64}$/i;

function decodeSignature(signature: string): Buffer | null {
  const value = signature.trim().replace(/^sha256=/i, "");
  if (!value) return null;
  if (HEX_SHA256.test(value)) return Buffer.from(value, "hex");
  // Shopier documents HMAC-SHA256 but not the encoding, so base64 and base64url are accepted too.
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) return null;
  const decoded = Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return decoded.length === 32 ? decoded : null;
}

/**
 * Verifies `Shopier-Signature`: HMAC-SHA256 of the raw request body keyed with the
 * subscription's webhook token. Constant-time comparison; empty inputs never verify.
 */
export function verifyShopierSignature(rawBody: string | Buffer, signature: string | null | undefined, token: string | null | undefined): boolean {
  if (!token || !signature) return false;
  const provided = decodeSignature(signature);
  if (!provided) return false;
  const expected = createHmac("sha256", token).update(rawBody).digest();
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
