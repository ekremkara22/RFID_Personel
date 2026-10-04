import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { MODULES } from "@/modules/registry";
import ui from "../management.module.css";
import styles from "./production.module.css";

export async function ProductionSectionPage({ title, description }: { title: string; description: string }) {
  const moduleName = (await getModuleCatalog()).find((item) => item.key === MODULES.PRODUCTION_PLANNING)?.name ?? MODULES.PRODUCTION_PLANNING;
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>{moduleName}</p><h1 className={ui.pageTitle}>{title}</h1><p className={ui.pageDescription}>{description}</p></div><div className={ui.headerActions}><Link href="/dashboard/production" className={ui.secondaryAction}><ArrowLeft size={16}/>Modül ana sayfası</Link></div></header>
    <section className={`${ui.surface} ${styles.emptyPanel}`}><div><h2>Altyapı hazır</h2><p>Bu alan modül yetkilendirmesi, menü yapısı ve sayfa standardıyla birlikte hazırlandı. Veri modeli ve iş akışları sonraki üretim planlama taleplerinizle eklenecek.</p></div></section>
  </div>;
}
