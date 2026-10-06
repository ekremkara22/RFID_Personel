import Link from "next/link";
import { Plus, Timer } from "lucide-react";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import { createCycleTimeAction } from "@/modules/production/actions";
import ui from "../../management.module.css";

export default async function CycleTimesPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const companyId = authorization.companyId;
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  const [stations, tools, cycleTimes] = await Promise.all([
    queryRepository.productionStation.findMany({ where: { companyId, isActive: true, workCenter: { isActive: true } }, include: { workCenter: { select: { name: true } } }, orderBy: [{ workCenter: { name: "asc" } }, { name: "asc" }] }),
    queryRepository.productionTool.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.productionCycleTime.findMany({ where: { companyId }, include: { station: { include: { workCenter: { select: { name: true } } } }, tool: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Sabit tanımlar</p><h1 className={ui.pageTitle}>Çevrim Süresi Standartları</h1><p className={ui.pageDescription}>Süreyi istasyon, parça ve isteğe bağlı kalıp/aparat birleşimiyle tanımlayın. İş emri oluşturulduğunda bu değerler plan kaydına sabitlenir.</p></div><div className={ui.headerActions}><Link href="/dashboard/production/definitions" className={ui.secondaryAction}>Sabit tanımlara dön</Link></div></header>
    {canManage && <section className={ui.surface}><form action={createCycleTimeAction} className={ui.formShell}><div className={ui.sectionHeading}><div><h2>Yeni çevrim standardı</h2><p>Enjeksiyonda göz adedi; CNC’de varsayılan olarak 1 kullanılmalıdır.</p></div><Timer size={18}/></div><div className={ui.formGridThree}><label className={ui.formField}><span>İstasyon</span><select name="stationId" required defaultValue=""><option value="" disabled>Seçin</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.workCenter.name} · {station.name}</option>)}</select></label><label className={ui.formField}><span>Parça kodu</span><input name="itemCode" required maxLength={96} placeholder="PRT-1001" /></label><label className={ui.formField}><span>Parça adı</span><input name="itemName" maxLength={255} placeholder="İsteğe bağlı" /></label><label className={ui.formField}><span>Kalıp / aparat</span><select name="toolId"><option value="">Kalıp/aparat yok</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}</select></label><label className={ui.formField}><span>Çevrim süresi (sn)</span><input name="cycleSeconds" required type="number" min="1" step="1" /></label><label className={ui.formField}><span>Göz adedi</span><input name="cavityCount" required defaultValue="1" type="number" min="1" step="1" /></label><label className={ui.formField}><span>Hazırlık süresi (dk)</span><input name="setupMinutes" defaultValue="0" type="number" min="0" step="1" /></label></div><div className={ui.formActions}><button className={ui.primaryAction} type="submit"><Plus size={16}/>Standardı kaydet</button></div></form></section>}
    <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Kayıtlı standartlar</h2><p>Son güncellenen 100 kayıt gösterilir.</p></div></div><div className={ui.tableWrap}><table className={ui.dataTable}><thead><tr><th>İstasyon</th><th>Parça</th><th>Kalıp/aparat</th><th>Çevrim</th><th>Hazırlık</th><th>Durum</th></tr></thead><tbody>{cycleTimes.length === 0 ? <tr><td colSpan={6} className={ui.emptyCell}>Henüz çevrim standardı tanımlanmadı.</td></tr> : cycleTimes.map((record) => <tr key={record.id}><td><strong>{record.station.name}</strong><br/><span>{record.station.workCenter.name}</span></td><td><strong>{record.itemCode}</strong><br/><span>{record.itemName ?? "—"}</span></td><td>{record.tool?.name ?? "Genel süre"}</td><td>{record.cycleSeconds} sn · {record.cavityCount} göz</td><td>{record.setupMinutes} dk</td><td><span className={record.isActive ? ui.statusNeutral : ui.statusDanger}>{record.isActive ? "Aktif" : "Pasif"}</span></td></tr>)}</tbody></table></div></section>
  </div>;
}
