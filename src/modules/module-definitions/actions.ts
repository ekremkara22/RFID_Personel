"use server";

import { revalidatePath } from "next/cache";

import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { runFormAction } from "@/lib/run-form-action";
import { ALL_MODULE_KEYS } from "@/modules/registry";
import { assertSuperadminUser, getString } from "@/modules/shared/action-helpers";

/** Only Shopier pages are accepted so a typo cannot send customers to an unexpected site. */
function normalizePurchaseUrl(value: string) {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ActionError("Satın alma bağlantısı geçerli bir adres olmalıdır.");
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (host !== "shopier.com" && !host.endsWith(".shopier.com"))) {
    throw new ActionError("Satın alma bağlantısı https:// ile başlayan bir Shopier adresi olmalıdır (ör. https://www.shopier.com/...).");
  }
  if (value.length > 500) throw new ActionError("Satın alma bağlantısı en fazla 500 karakter olabilir.");
  return url.toString();
}

export async function updateModuleDefinitionAction(formData: FormData) {
  return runFormAction(async () => {
    await assertSuperadminUser();
    const key = getString(formData, "key");
    const name = getString(formData, "name");
    const description = getString(formData, "description");
    const priceLabel = getString(formData, "priceLabel");
    const purchaseUrl = normalizePurchaseUrl(getString(formData, "purchaseUrl"));

    if (!ALL_MODULE_KEYS.includes(key as never)) throw new ActionError("Geçersiz modül kodu.");
    if (name.length < 2 || name.length > 100) throw new ActionError("Modül adı 2–100 karakter olmalıdır.");
    if (description.length > 500) throw new ActionError("Modül açıklaması en fazla 500 karakter olabilir.");
    if (priceLabel.length > 100) throw new ActionError("Fiyat bilgisi en fazla 100 karakter olabilir.");

    const data = { name, description: description || null, priceLabel: priceLabel || null, purchaseUrl };
    await prisma.moduleDefinition.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings/modules");
    revalidatePath("/dashboard/store");
    // Public site shows the same purchase links next to every module card.
    revalidatePath("/", "layout");
  });
}
