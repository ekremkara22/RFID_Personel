import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ActionError } from "@/lib/action-error";
import { detectImageType, MAX_PRODUCT_IMAGE_BYTES } from "./product-rules";

/**
 * Product images live outside `public/` (files added after `next build` are not served from there)
 * and are served by /api/integrations/shopier/product-images/[file]. Shopier fetches them by URL
 * when a product is published, so the route is public; images are not secret.
 */
const DEFAULT_DIRECTORY = path.join(/* turbopackIgnore: true */ process.cwd(), "var", "commerce-products");
const STORAGE_KEY = /^[0-9a-f-]{36}\.(jpg|png)$/;

export const PRODUCT_IMAGE_ROUTE = "/api/integrations/shopier/product-images";

function storageDirectory() {
  return path.resolve(process.env.COMMERCE_MEDIA_DIR || DEFAULT_DIRECTORY);
}

export function isProductImageKey(key: string) {
  return STORAGE_KEY.test(key);
}

function storagePath(key: string) {
  if (!isProductImageKey(key)) throw new Error("Invalid product image key.");
  return path.join(storageDirectory(), key);
}

/** Validates (type by magic bytes, size) and stores one uploaded image; returns its storage key. */
export async function saveProductImage(file: File): Promise<string> {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new ActionError(`"${file.name}" 2 MB sınırını aşıyor. Görseli küçültüp tekrar yükleyin.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new ActionError(`"${file.name}" JPG veya PNG biçiminde olmalıdır.`);
  const key = `${randomUUID()}.${type}`;
  await mkdir(storageDirectory(), { recursive: true });
  await writeFile(storagePath(key), bytes);
  return key;
}

export async function readProductImage(key: string): Promise<Buffer | null> {
  if (!isProductImageKey(key)) return null;
  try {
    return await readFile(storagePath(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteProductImageFile(key: string | null | undefined) {
  if (!key || !isProductImageKey(key)) return;
  await unlink(storagePath(key)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

/** Panel-relative URL for <img>. */
export function productImagePath(image: { storageKey: string | null; sourceUrl: string | null }) {
  return image.storageKey ? `${PRODUCT_IMAGE_ROUTE}/${image.storageKey}` : image.sourceUrl;
}
