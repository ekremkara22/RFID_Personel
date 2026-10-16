import { Check } from "lucide-react";
import Link from "next/link";
import type { MarketingModule } from "@/lib/marketing/modules";
import { ModuleActions } from "./module-actions";
import styles from "./site.module.css";

export function ModuleCard({ module, headingLevel = "h3" }: { module: MarketingModule; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className={styles.moduleCard}>
      <div className={styles.moduleCardHead}>
        <Heading><Link href={module.href}>{module.title}</Link></Heading>
        {module.priceLabel ? <span className={styles.price}>{module.priceLabel}</span> : null}
      </div>
      <p>{module.summary}</p>
      <ul className={styles.checkList}>
        {module.highlights.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}
      </ul>
      <div className={styles.moduleCardFoot}>
        <ModuleActions module={module} />
        <Link href={module.href} className={styles.inlineLink}>Ayrıntılar</Link>
      </div>
    </article>
  );
}

/** Narrow card for page sidebars: stays in view while the visitor reads the page. */
export function ModuleSideCard({ module, note }: { module: MarketingModule; note?: string }) {
  return (
    <aside className={styles.sideOffer} aria-label={`${module.title} satın alma`}>
      <span className={styles.sideOfferLabel}>Modül</span>
      <h2><Link href={module.href}>{module.title}</Link></h2>
      {module.priceLabel ? <p className={styles.sideOfferPrice}>{module.priceLabel}</p> : null}
      <p>{note ?? module.summary}</p>
      <ModuleActions module={module} compact />
      <p className={styles.sideOfferHint}>14 gün boyunca tüm modüller açık (Muhasebe CSV/PDF aktarımı hariç), kart bilgisi istenmez. Satın alırken Flodeska hesabınızın e-posta adresini kullanın; ödeme onaylanınca lisans hesabınıza tanımlanır.</p>
    </aside>
  );
}

/** Fixed bottom bar on narrow screens so the purchase action is always one tap away. */
export function ModuleBuyBar({ module }: { module: MarketingModule }) {
  return (
    <div className={styles.buyBar}>
      <span>{module.shortTitle}{module.priceLabel ? ` · ${module.priceLabel}` : ""}</span>
      <ModuleActions module={module} compact />
    </div>
  );
}
