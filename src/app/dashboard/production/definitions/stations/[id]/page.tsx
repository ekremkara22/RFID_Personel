import Link from "next/link";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/authorization";
import { parseRouteId } from "@/lib/ids";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { deleteStationAction, updateStationAction } from "@/modules/production/actions";
import { PRODUCTION_STATION_TYPES, productionStationTypeLabel } from "@/modules/production/labels";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../../management.module.css";

export default async function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const id = parseRouteId((await params).id);
  const [item, workCenters, calendars] = await Promise.all([
    queryRepository.productionStation.findFirst({ where: { id, companyId: authorization.companyId }, include: { workCenter: { select: { name: true } }, calendarTemplate: { select: { name: true } } } }),
    queryRepository.productionWorkCenter.findMany({ where: { companyId: authorization.companyId, isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    queryRepository.workCalendarTemplate.findMany({ where: { companyId: authorization.companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!item) notFound();
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>İstasyon Detayı</p><h1 className={ui.pageTitle}>{item.name}</h1><p className={ui.pageDescription}>{item.workCenter.name} iş merkezine bağlı {item.code} kodlu istasyon.</p></div><div className={ui.headerActions}><Link className={ui.secondaryAction} href="/dashboard/production/definitions/stations">Listeye dön</Link></div></header>
    {canManage ? <><section className={ui.surface}><form action={updateStationAction} className={ui.formShell}><input type="hidden" name="id" value={item.id}/><div className={ui.formGrid}><label className={ui.formField}><span>İş merkezi</span><select name="workCenterId" required defaultValue={item.workCenterId}>{workCenters.map((center) => <option key={center.id} value={center.id}>{center.name} · {center.code}</option>)}</select></label><label className={ui.formField}><span>İstasyon türü</span><select name="stationType" defaultValue={item.stationType}>{PRODUCTION_STATION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={ui.formField}><span>Kod</span><input name="code" required defaultValue={item.code}/></label><label className={ui.formField}><span>İstasyon adı</span><input name="name" required defaultValue={item.name}/></label><label className={ui.formField}><span>Çalışma takvimi</span><select name="calendarTemplateId" defaultValue={item.calendarTemplateId ?? ""}><option value="">İş merkezi / firma varsayılanı</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label><label className={ui.checkField}><input name="isActive" type="checkbox" defaultChecked={item.isActive}/> Aktif</label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>Açıklama</span><textarea name="description" defaultValue={item.description ?? ""}/></label></div><div className={ui.formActions}><button className={ui.primaryAction}>Değişiklikleri kaydet</button></div></form></section><section className={ui.dangerZone}><div><h3>İstasyonu sil</h3><p>Çevrim standardı veya iş emrinde kullanılan istasyonlar silinemez.</p></div><form action={deleteStationAction}><input type="hidden" name="id" value={item.id}/><button className={ui.dangerAction}>İstasyonu sil</button></form></section></> : <section className={ui.surface}><dl className={ui.detailList}><div className={ui.detailRow}><dt>Kod</dt><dd>{item.code}</dd></div><div className={ui.detailRow}><dt>İş merkezi</dt><dd>{item.workCenter.name}</dd></div><div className={ui.detailRow}><dt>Tür</dt><dd>{productionStationTypeLabel(item.stationType)}</dd></div><div className={ui.detailRow}><dt>Takvim</dt><dd>{item.calendarTemplate?.name ?? "İş merkezi / firma varsayılanı"}</dd></div><div className={ui.detailRow}><dt>Durum</dt><dd>{item.isActive ? "Aktif" : "Pasif"}</dd></div><div className={ui.detailRow}><dt>Açıklama</dt><dd>{item.description ?? "—"}</dd></div></dl></section>}
  </div>;
}
