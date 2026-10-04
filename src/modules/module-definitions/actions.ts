"use server";

import { revalidatePath } from "next/cache";

import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { runFormAction } from "@/lib/run-form-action";
import { ALL_MODULE_KEYS } from "@/modules/registry";
import { assertSuperadminUser, getString } from "@/modules/shared/action-helpers";

export async function updateModuleDefinitionAction(formData: FormData) {
  return runFormAction(async () => {
    await assertSuperadminUser();
    const key = getString(formData, "key");
    const name = getString(formData, "name");
    const description = getString(formData, "description");

    if (!ALL_MODULE_KEYS.includes(key as never)) throw new ActionError("Geçersiz modül kodu.");
    if (name.length < 2 || name.length > 100) throw new ActionError("Modül adı 2–100 karakter olmalıdır.");
    if (description.length > 500) throw new ActionError("Modül açıklaması en fazla 500 karakter olabilir.");

    await prisma.moduleDefinition.upsert({
      where: { key },
      create: { key, name, description: description || null },
      update: { name, description: description || null },
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings/modules");
  });
}
