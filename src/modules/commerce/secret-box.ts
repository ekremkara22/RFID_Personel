import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM envelope for integration secrets. Pure (key passed in) so it is unit tested;
 * credentials.ts supplies the key from INTEGRATION_ENCRYPTION_KEY.
 * Format: v1:<iv b64>:<auth tag b64>:<ciphertext b64>. `context` is bound as AAD so a
 * value copied to another provider/key row does not decrypt.
 */
const VERSION = "v1";

export class SecretKeyError extends Error {}

export function parseEncryptionKey(raw: string | undefined): Buffer {
  if (!raw || !raw.trim()) throw new SecretKeyError("INTEGRATION_ENCRYPTION_KEY ortam değişkeni tanımlı değil. Sunucuda 32 baytlık base64 bir anahtar tanımlanmalıdır.");
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) throw new SecretKeyError("INTEGRATION_ENCRYPTION_KEY 32 baytlık base64 bir değer olmalıdır (ör. `openssl rand -base64 32`).");
  return key;
}

export function encryptSecret(plain: string, key: Buffer, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(envelope: string, key: Buffer, context: string): string {
  const [version, iv, tag, ciphertext] = envelope.split(":");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error("Unsupported secret envelope.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** Last four characters for masked display; short values reveal nothing. */
export function secretLast4(value: string): string | null {
  return value.length >= 12 ? value.slice(-4) : null;
}
