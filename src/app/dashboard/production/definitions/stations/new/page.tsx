import Link from "next/link";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createStationAction } from "@/modules/production/actions";
import { PRODUCTION_STATION_TYPES } from "@/modules/production/labels";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../../management.module.css";

export default async function NewStationPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const [workCenters, calendars] = await Promise.all([
    queryRepository.productionWorkCenter.findMany({ where: { companyId: authorization.companyId, isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    queryRepository.workCalendarTemplate.findMany({ where: { companyId: authorization.companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>İstasyonlar</p><h1 className={ui.pageTitle}>Yeni istasyon tanımla</h1><p className={ui.pageDescription}>İstasyonu iş merkezine bağlayın ve planlamada kullanılacak türünü belirleyin.</p></div><div className={ui.headerActions}><Link className={ui.secondaryAction} href="/dashboard/production/definitions/stations">Listeye dön</Link></div></header>
    <section className={ui.surface}><form action={createStationAction} className={ui.formShell}><div className={ui.formGrid}><label className={ui.formField}><span>İş merkezi</span><select name="workCenterId" required defaultValue=""><option value="" disabled>İş merkezi seçin</option>{workCenters.map((center) => <option key={center.id} value={center.id}>{center.name} · {center.code}</option>)}</select></label><label className={ui.formField}><span>İstasyon türü</span><select name="stationType" defaultValue="GENERAL">{PRODUCTION_STATION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} placeholder="IST-001"/></label><label className={ui.formField}><span>İstasyon adı</span><input name="name" required maxLength={160} placeholder="Enjeksiyon 01"/></label><label className={ui.formField}><span>Çalışma takvimi</span><select name="calendarTemplateId"><option value="">İş merkezi / firma varsayılanı</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>Açıklama</span><textarea name="description" placeholder="İsteğe bağlı açıklama"/></label></div><div className={ui.formActions}><button className={ui.primaryAction}>İstasyonu kaydet</button></div></form></section>
  </div>;
}
