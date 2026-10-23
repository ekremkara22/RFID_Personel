import "server-only";

import { CommerceProductStatus } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { ingestOrder } from "./license-activation";
import { normalizeShopierId } from "./license-rules";
import { deleteProductImageFile, PRODUCT_IMAGE_ROUTE, saveProductImage } from "./product-media";
import {
  buildFulfillmentPayload,
  buildShopierProductPayload,
  MAX_PRODUCT_IMAGES,
  normalizeImportedProduct,
  type FulfillmentInput,
  type ProductInput,
} from "./product-rules";
import { getShopierClient } from "./shopier-client";

/**
 * Physical product catalog writes. The panel is the source of truth: products are edited here
 * and pushed to Shopier with publishProduct; Shopier products are imported once (importShopierProducts)
 * and are not overwritten by later imports.
 */

function prismaCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : null;
}

async function findProductOrThrow(id: number) {
  const product = await prisma.commerceProduct.findUnique({ where: { id }, include: { images: { orderBy: { placement: "asc" } } } });
  if (!product) throw new ActionError("Ürün bulunamadı; sayfayı yenileyin.");
  return product;
}

async function storeUploads(files: File[]) {
  const keys: string[] = [];
  try {
    for (const file of files) keys.push(await saveProductImage(file));
    return keys;
  } catch (error) {
    await Promise.all(keys.map((key) => deleteProductImageFile(key)));
    throw error;
  }
}

export async function createProduct(input: ProductInput, files: File[]) {
  if (files.length > MAX_PRODUCT_IMAGES) throw new ActionError(`En fazla ${MAX_PRODUCT_IMAGES} görsel yüklenebilir.`);
  const keys = await storeUploads(files);
  try {
    const product = await prisma.commerceProduct.create({
      data: { ...input, images: { create: keys.map((storageKey, index) => ({ storageKey, placement: index + 1 })) } },
      select: { id: true },
    });
    return product.id;
  } catch (error) {
    await Promise.all(keys.map((key) => deleteProductImageFile(key)));
    throw error;
  }
}

/** Updates fields and appends new uploads after the existing images. */
export async function updateProduct(id: number, input: ProductInput, files: File[]) {
  const product = await findProductOrThrow(id);
  if (product.images.length + files.length > MAX_PRODUCT_IMAGES) throw new ActionError(`Bir ürünün en fazla ${MAX_PRODUCT_IMAGES} görseli olabilir. Önce bazı görselleri kaldırın.`);
  const keys = await storeUploads(files);
  const nextPlacement = product.images.length;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.commerceProduct.update({ where: { id }, data: input });
      if (keys.length) await tx.commerceProductImage.createMany({ data: keys.map((storageKey, index) => ({ productId: id, storageKey, placement: nextPlacement + index + 1 })) });
    });
  } catch (error) {
    await Promise.all(keys.map((key) => deleteProductImageFile(key)));
    throw error;
  }
  return { published: product.status === CommerceProductStatus.PUBLISHED };
}

async function renumberImages(images: { id: number; placement: number }[]) {
  await prisma.$transaction(
    images.flatMap((image, index) => (image.placement === index + 1 ? [] : [prisma.commerceProductImage.update({ where: { id: image.id }, data: { placement: index + 1 } })])),
  );
}

/** Makes the given image primary (placement 1) and shifts the others. */
export async function makePrimaryImage(productId: number, imageId: number) {
  const product = await findProductOrThrow(productId);
  const target = product.images.find((image) => image.id === imageId);
  if (!target) throw new ActionError("Görsel bulunamadı; sayfayı yenileyin.");
  await renumberImages([target, ...product.images.filter((image) => image.id !== imageId)]);
}

export async function removeProductImage(productId: number, imageId: number) {
  const product = await findProductOrThrow(productId);
  const target = product.images.find((image) => image.id === imageId);
  if (!target) throw new ActionError("Görsel bulunamadı; sayfayı yenileyin.");
  await prisma.commerceProductImage.delete({ where: { id: imageId } });
  await renumberImages(product.images.filter((image) => image.id !== imageId));
  await deleteProductImageFile(target.storageKey);
}

/** Creates the product on Shopier, or updates it when it is already linked. */
export async function publishProduct(id: number, publicBaseUrl: string) {
  const product = await findProductOrThrow(id);
  const imageUrls = product.images
    .map((image) => (image.storageKey ? new URL(`${PRODUCT_IMAGE_ROUTE}/${image.storageKey}`, publicBaseUrl).toString() : image.sourceUrl))
    .filter((url): url is string => !!url);
  const payload = buildShopierProductPayload(product, imageUrls);
  const client = await getShopierClient();
  let result: Awaited<ReturnType<typeof client.createProduct>>;
  try {
    result = product.shopierProductId ? await client.updateProduct(product.shopierProductId, payload) : await client.createProduct(payload);
  } catch (error) {
    const message = error instanceof ActionError ? error.message : "Shopier'e gönderilemedi.";
    await prisma.commerceProduct.update({ where: { id }, data: { publishError: message.slice(0, 500) } });
    throw error;
  }
  const shopierProductId = normalizeShopierId(result?.id) ?? product.shopierProductId;
  if (!shopierProductId) {
    // The product may exist on Shopier without a link here; a second POST would duplicate it.
    const message = "Shopier isteği kabul etti ama ürün numarası döndürmedi. Tekrar yayınlamadan önce Shopier panelini kontrol edin; ürün açıldıysa “Shopier'den içe aktar” ile bağlayın ve bu taslağı silin.";
    await prisma.commerceProduct.update({ where: { id }, data: { publishError: message } });
    throw new ActionError(message);
  }
  try {
    await prisma.commerceProduct.update({
      where: { id },
      data: {
        status: CommerceProductStatus.PUBLISHED,
        shopierProductId,
        shopierUrl: typeof result?.url === "string" && /^https:\/\//i.test(result.url) ? result.url.slice(0, 500) : product.shopierUrl,
        publishedAt: new Date(),
        publishError: null,
      },
    });
    return { created: !product.shopierProductId };
  } catch (error) {
    // Shopier already has the product; tell the admin its number so it is not published twice.
    const reason = prismaCode(error) === "P2002" ? "bu Shopier ürünü başka bir katalog kaydına bağlı" : "panel kaydı güncellenemedi";
    throw new ActionError(`Ürün Shopier'e gönderildi (Shopier no: ${shopierProductId}) ancak ${reason}. Tekrar yayınlamadan önce Shopier panelini kontrol edin.`);
  }
}

/** Removes the product from Shopier (sale stops) and keeps the local record as ARCHIVED. */
export async function unpublishProduct(id: number) {
  const product = await findProductOrThrow(id);
  if (product.shopierProductId) {
    const client = await getShopierClient();
    try {
      await client.deleteProduct(product.shopierProductId);
    } catch (error) {
      // Already deleted on Shopier: unlink locally anyway.
      if (!(error instanceof ActionError) || !error.message.includes("bulunamadı")) throw error;
    }
  }
  await prisma.commerceProduct.update({ where: { id }, data: { status: CommerceProductStatus.ARCHIVED, shopierProductId: null, shopierUrl: null, publishError: null } });
}

/** Marks the product customers see as the RFID reader in the panel; only one product holds the flag. */
export async function setDeviceOffer(id: number, enabled: boolean) {
  await findProductOrThrow(id);
  await prisma.$transaction([
    ...(enabled ? [prisma.commerceProduct.updateMany({ where: { isDeviceOffer: true, NOT: { id } }, data: { isDeviceOffer: false } })] : []),
    prisma.commerceProduct.update({ where: { id }, data: { isDeviceOffer: enabled } }),
  ]);
}

/** Local delete; a product still on sale must be removed from Shopier first. */
export async function deleteProduct(id: number) {
  const product = await findProductOrThrow(id);
  if (product.shopierProductId) throw new ActionError("Ürün Shopier'de satışta. Önce “Shopier'den kaldır” ile satışı durdurun.");
  await prisma.commerceProduct.delete({ where: { id } });
  await Promise.all(product.images.map((image) => deleteProductImageFile(image.storageKey)));
}

/** One-way import of Shopier's physical products that are not in the catalog yet. */
export async function importShopierProducts() {
  const client = await getShopierClient();
  const products = await client.listProducts({ productType: "physical" });
  const totals = { found: 0, imported: 0, existing: 0, skipped: 0 };
  for (const raw of products) {
    const item = normalizeImportedProduct(raw);
    if (!item) {
      totals.skipped += 1;
      continue;
    }
    totals.found += 1;
    const { imageUrls, ...fields } = item;
    try {
      await prisma.commerceProduct.create({
        data: {
          ...fields,
          status: CommerceProductStatus.PUBLISHED,
          publishedAt: new Date(),
          images: { create: imageUrls.map((sourceUrl, index) => ({ sourceUrl, placement: index + 1 })) },
        },
      });
      totals.imported += 1;
    } catch (error) {
      if (prismaCode(error) !== "P2002") throw error;
      totals.existing += 1;
    }
  }
  return totals;
}

/** Marks a paid physical order as shipped on Shopier and stores the tracking info locally. */
export async function fulfillOrder(orderId: number, input: FulfillmentInput, adminId: number) {
  const order = await prisma.shopierOrder.findUnique({ where: { id: orderId }, select: { shopierOrderId: true, status: true, paymentStatus: true, hasPhysicalItems: true, refundStatus: true, fulfilledAt: true } });
  if (!order) throw new ActionError("Sipariş bulunamadı; sayfayı yenileyin.");
  if (!order.hasPhysicalItems) throw new ActionError("Bu siparişte fiziksel ürün yok; kargo bilgisi girilemez.");
  if (order.paymentStatus !== "paid") throw new ActionError("Ödemesi tamamlanmamış sipariş kargoya verilemez.");
  if (order.refundStatus === "full") throw new ActionError("Tam iade edilmiş sipariş kargoya verilemez.");
  if (order.fulfilledAt || order.status === "fulfilled") throw new ActionError("Bu sipariş zaten gönderildi olarak işaretlendi veya Shopier'de kapatıldı.");
  const client = await getShopierClient();
  const updated = await client.updateOrder(order.shopierOrderId, buildFulfillmentPayload(input));
  await prisma.shopierOrder.update({
    where: { id: orderId },
    data: { shippingCompany: input.shippingCompany, trackingNumber: input.trackingNumber, fulfilledAt: new Date(), fulfilledById: adminId },
  });
  // Refresh status/payload from Shopier's response; license rules stay idempotent.
  if (updated) await ingestOrder(updated, "SYNC").catch(() => undefined);
}
