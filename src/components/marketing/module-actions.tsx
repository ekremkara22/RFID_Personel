import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { MarketingModule } from "@/lib/marketing/modules";
import styles from "./site.module.css";

/** Purchase + free trial pair shown next to every module card on the public site. */
export function ModuleActions({ module, compact = false }: { module: Pick<MarketingModule, "title" | "purchaseUrl">; compact?: boolean }) {
  return (
    <div className={`${styles.moduleActions} ${compact ? styles.moduleActionsCompact : ""}`}>
      {module.purchaseUrl ? (
        <a href={module.purchaseUrl} target="_blank" rel="noopener noreferrer" className={styles.buyButton} aria-label={`${module.title} modülünü Shopier üzerinden satın al (yeni sekmede açılır)`}>
          Satın al <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      ) : (
        <Link href="/iletisim" className={styles.buyButton} aria-label={`${module.title} için fiyat ve satın alma bilgisi isteyin`}>Fiyat al</Link>
      )}
      <Link href="/register" className={styles.ghostButton}>Ücretsiz dene</Link>
    </div>
  );
}
