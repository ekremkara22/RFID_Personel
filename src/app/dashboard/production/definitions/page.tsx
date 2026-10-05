import Link from "next/link";
import { Building2, Factory, Plus, Settings2 } from "lucide-react";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { createStationAction, createToolAction, createWorkCenterAction } from "@/modules/production/actions";
import ui from "../../management.module.css";
import styles from "../production.module.css";

export default async function ProductionDefinitionsPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const companyId = authorization.companyId;
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  const [workCenters, calendars, tools] = await Promise.all([
    prisma.productionWorkCenter.findMany({ where: { companyId }, include: { stations: { orderBy: { name: "asc" } }, _count: { select: { workOrders: true } } }, orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.workCalendarTemplate.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.productionTool.findMany({ where: { companyId }, orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
  ]);

  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}>
      <div className={ui.headerCopy}><p className={ui.kicker}>Üretim planlama</p><h1 className={ui.pageTitle}>Sabit Tanımlar</h1><p className={ui.pageDescription}>İş merkezlerini ve istasyonları planlama için tanımlayın. İstasyon kapasitesi bağlı çalışma takviminden hesaplanır.</p></div>
      <div className={ui.headerActions}>
        <Link href="/dashboard/production/cycle-times" className={ui.secondaryAction}><Settings2 size={16}/>Çevrim standartları</Link>
        <Link href="/dashboard/production" className={ui.secondaryAction}>Modül ana sayfası</Link>
      </div>
    </header>

    {canManage && <section className={ui.splitLayout}>
      <form action={createWorkCenterAction} className={`${ui.surface} ${ui.formShell}`}>
        <div className={ui.sectionHeading}><div><h2>İş merkezi ekle</h2><p>İstasyonları gruplayan üretim alanını oluşturun.</p></div><Building2 size={18}/></div>
        <div className={ui.formGrid}><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} placeholder="ENJEKSIYON" /></label><label className={ui.formField}><span>Ad</span><input name="name" required maxLength={160} placeholder="Enjeksiyon Atölyesi" /></label><label className={ui.formField}><span>Çalışma takvimi</span><select name="calendarTemplateId"><option value="">Firma varsayılanı</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>Açıklama</span><input name="description" maxLength={1000} placeholder="İsteğe bağlı açıklama" /></label></div>
        <div className={ui.formActions}><button className={ui.primaryAction} type="submit"><Plus size={16}/>İş merkezi ekle</button></div>
      </form>
      <form action={createStationAction} className={`${ui.surface} ${ui.formShell}`}>
        <div className={ui.sectionHeading}><div><h2>İstasyon ekle</h2><p>Gantt ve kapasite hesabının gerçek kaynağıdır.</p></div><Factory size={18}/></div>
        <div className={ui.formGrid}><label className={ui.formField}><span>Bağlı iş merkezi</span><select name="workCenterId" required defaultValue=""><option value="" disabled>Seçin</option>{workCenters.filter((item) => item.isActive).map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></label><label className={ui.formField}><span>Tür</span><select name="stationType"><option value="GENERAL">Genel</option><option value="INJECTION">Enjeksiyon</option><option value="CNC_TURNING">CNC torna</option><option value="CNC_MILLING">CNC freze</option><option value="ASSEMBLY">Montaj</option><option value="QUALITY">Kalite</option></select></label><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} placeholder="ENJ-01" /></label><label className={ui.formField}><span>Ad</span><input name="name" required maxLength={160} placeholder="Enjeksiyon Makinesi 01" /></label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>İstasyon takvimi</span><select name="calendarTemplateId"><option value="">İş merkezi takvimini kullan</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label></div>
        <div className={ui.formActions}><button className={ui.primaryAction} type="submit"><Plus size={16}/>İstasyon ekle</button></div>
      </form>
    </section>}

    {canManage && <section className={ui.splitLayout}>
      <form action={createToolAction} className={`${ui.surface} ${ui.formShell}`}>
        <div className={ui.sectionHeading}><div><h2>Kalıp / aparat ekle</h2><p>Kalıp eşzamanlı kullanım kısıtı oluşturmaz; çevrim standardını ayrıştırmak için kullanılır.</p></div><Settings2 size={18}/></div>
        <div className={ui.formGrid}><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} placeholder="KALIP-01" /></label><label className={ui.formField}><span>Ad</span><input name="name" required maxLength={160} placeholder="Kapak Kalıbı" /></label><label className={ui.formField}><span>Tür</span><input name="toolType" maxLength={80} placeholder="Kalıp, aparat, takım..." /></label><label className={ui.formField}><span>Açıklama</span><input name="description" maxLength={1000} /></label></div>
        <div className={ui.formActions}><button className={ui.primaryAction} type="submit"><Plus size={16}/>Kalıp/aparat ekle</button></div>
      </form>
      <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Kayıtlı kalıp ve aparatlar</h2><p>Çevrim standardında seçilebilir.</p></div><span className={ui.statusNeutral}>{tools.length} kayıt</span></div>{tools.length ? <ul className={ui.detailList}>{tools.map((tool) => <li key={tool.id} className={ui.detailRow}><span><strong>{tool.name}</strong><br/>{tool.code}</span><span>{tool.toolType ?? "Tür belirtilmedi"}<br/>{tool.isActive ? "Aktif" : "Pasif"}</span></li>)}</ul> : <p className={ui.helpText}>Henüz kalıp veya aparat tanımlanmadı.</p>}</section>
    </section>}

    <section className={ui.surface}>
      <div className={ui.sectionHeading}><div><h2>İş merkezleri ve istasyonlar</h2><p>Pasif kayıtlar geçmiş planları korur; kullanımdaki tanımlar silinmez.</p></div><span className={ui.statusNeutral}>{workCenters.length} iş merkezi</span></div>
      <div className={ui.tableWrap}><table className={ui.dataTable}><thead><tr><th>İş merkezi</th><th>İstasyonlar</th><th>Takvim</th><th>Planlanan iş</th><th>Durum</th></tr></thead><tbody>{workCenters.length === 0 ? <tr><td colSpan={5} className={ui.emptyCell}>Henüz iş merkezi tanımlanmadı.</td></tr> : workCenters.map((center) => <tr key={center.id}><td><strong>{center.name}</strong><br/><span className={styles.mutedCode}>{center.code}</span></td><td>{center.stations.length ? <ul className={styles.stationList}>{center.stations.map((station) => <li key={station.id}><span>{station.name}</span><small>{station.code} · {station.stationType.replaceAll("_", " ")}</small></li>)}</ul> : <span className={ui.statusNeutral}>İstasyon yok</span>}</td><td>{center.calendarTemplateId ? "Merkez takvimi bağlı" : "Firma varsayılanı"}</td><td>{center._count.workOrders}</td><td><span className={center.isActive ? ui.statusNeutral : ui.statusDanger}>{center.isActive ? "Aktif" : "Pasif"}</span></td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
