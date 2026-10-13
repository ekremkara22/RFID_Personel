import "server-only";

import { prisma } from "@/lib/prisma";
import { MODULE_REGISTRY } from "@/modules/registry";

export type DisplayModuleDefinition = {
  key: (typeof MODULE_REGISTRY)[number]["key"];
  name: string;
  description: string;
  href: string;
  highlights: readonly string[];
  purchaseUrl: string | null;
  priceLabel: string | null;
};

export async function getModuleCatalog(): Promise<DisplayModuleDefinition[]> {
  const definitions = await prisma.moduleDefinition.findMany({
    where: { key: { in: MODULE_REGISTRY.map((module) => module.key) } },
  });
  const byKey = new Map(definitions.map((definition) => [definition.key, definition]));

  return MODULE_REGISTRY.map((module) => {
    const definition = byKey.get(module.key);
    return {
      key: module.key,
      name: definition?.name.trim() || module.name,
      description: definition?.description?.trim() || module.description,
      href: module.href,
      highlights: module.highlights,
      purchaseUrl: definition?.purchaseUrl?.trim() || null,
      priceLabel: definition?.priceLabel?.trim() || null,
    };
  });
}

export function createModuleNameMap(catalog: readonly DisplayModuleDefinition[]) {
  return new Map(catalog.map((module) => [module.key as string, module.name]));
}
