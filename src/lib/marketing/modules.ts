import "server-only";

import type { DisplayModuleDefinition } from "@/modules/module-definitions/repository";
import { MODULES, type ModuleKey } from "@/modules/registry";

export type MarketingModule = {
  key: ModuleKey;
  title: string;
  shortTitle: string;
  href: string;
  summary: string;
  highlights: readonly string[];
  /** Shopier page the super admin entered under Ayarlar > Modüller; null until one is saved. */
  purchaseUrl: string | null;
  priceLabel: string | null;
};

const MARKETING_MODULES: Omit<MarketingModule, "purchaseUrl" | "priceLabel">[] = [
  {
    key: MODULES.HR,
    title: "İK & RFID Personel Takip",
    shortTitle: "İK & RFID",
    href: "/moduller/ik-rfid-personel-takip",
    summary: "Kartını okutan personelin giriş, çıkış ve molası panele düşer. İzin, çalışma takvimi ve puantaj aynı kayıtla yürür.",
    highlights: ["RFID kartla giriş, çıkış ve mola", "İzin, takvim ve aylık puantaj onayı", "Cihaz bağlantı ve sağlık takibi"],
  },
  {
    key: MODULES.ACCOUNTING,
    title: "Muhasebe: Maaş ve Bütçe",
    shortTitle: "Muhasebe",
    href: "/moduller/muhasebe",
    summary: "Brütten nete ve netten brüte maaşı 12 ay boyunca hesaplar, işveren maliyetini çıkarır ve yıllık personel bütçesini raporlar.",
    highlights: ["Brütten nete / netten brüte, aylık döküm", "Güncel 2026 bordro parametreleri", "Departman ve aylık bütçe raporu"],
  },
];

/**
 * Public module list with the purchase links from the module catalog. Without DATABASE_URL (local
 * preview) the site renders without links; the import is dynamic because the Prisma module throws at
 * load in that case. A real database error is rethrown so ISR keeps serving the last good page instead
 * of caching one without purchase links.
 */
export async function getMarketingModules(): Promise<MarketingModule[]> {
  let catalog: DisplayModuleDefinition[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { getModuleCatalog } = await import("@/modules/module-definitions/repository");
      catalog = await getModuleCatalog();
    } catch (error) {
      console.error("Tanıtım sitesi modül kataloğunu okuyamadı.", error);
      throw error;
    }
  }
  const byKey = new Map(catalog.map((item) => [item.key, item]));
  return MARKETING_MODULES.map((module) => ({
    ...module,
    purchaseUrl: byKey.get(module.key)?.purchaseUrl ?? null,
    priceLabel: byKey.get(module.key)?.priceLabel ?? null,
  }));
}

export async function getMarketingModule(key: ModuleKey) {
  const modules = await getMarketingModules();
  return modules.find((module) => module.key === key)!;
}
