import Link from "next/link";
import { Building2, Factory, Settings2, Timer } from "lucide-react";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import ui from "../../management.module.css";

const definitions = [
  { href: "/dashboard/production/definitions/work-centers", title: "İş Merkezleri", description: "İş merkezi tanımı, arama, içe/dışa aktarma ve kayıt yönetimi.", icon: Building2 },
  { href: "/dashboard/production/definitions/stations", title: "İstasyonlar", description: "İş merkezine bağlı istasyonları ve türlerini yönetin.", icon: Factory },
  { href: "/dashboard/production/definitions/tools", title: "Kalıp ve Ekipman", description: "Kalıp, aparat ve ekipman tanımlarını yönetin.", icon: Settings2 },
  { href: "/dashboard/production/cycle-times", title: "Çevrim Süreleri", description: "İstasyon, parça ve ekipman bazlı çevrim standartları.", icon: Timer },
];

export default async function ProductionDefinitionsPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  return <div className={ui.managementPage}><header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Üretim planlama</p><h1 className={ui.pageTitle}>Sabit Tanımlar</h1><p className={ui.pageDescription}>Her tanım türünü kendi standart liste ve kayıt ekranından yönetin.</p></div><div className={ui.headerActions}><Link href="/dashboard/production/work-orders" className={ui.secondaryAction}>İş emirleri</Link><Link href="/dashboard/production" className={ui.secondaryAction}>Modül ana sayfası</Link></div></header><section className={ui.navigationGrid}>{definitions.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={ui.navigationCard}><span className={ui.navigationCardIcon}><Icon size={20}/></span><span><h2>{item.title}</h2><p>{item.description}</p></span></Link>; })}</section></div>;
}
