import Link from "next/link";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/authorization";
import { parseRouteId } from "@/lib/ids";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { deleteWorkCenterAction, updateWorkCenterAction } from "@/modules/production/actions";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../../management.module.css";

export default async function WorkCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const id = parseRouteId((await params).id);
  const [item, calendars] = await Promise.all([
    queryRepository.productionWorkCenter.findFirst({ where: { id, companyId: authorization.companyId }, include: { calendarTemplate: { select: { name: true } } } }),
    queryRepository.workCalendarTemplate.findMany({ where: { companyId: authorization.companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!item) notFound();
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>İş Merkezi Detayı</p><h1 className={ui.pageTitle}>{item.name}</h1><p className={ui.pageDescription}>{item.code} kodlu iş merkezi bilgilerini inceleyin{canManage ? " ve güncelleyin" : ""}.</p></div><div className={ui.headerActions}><Link className={ui.secondaryAction} href="/dashboard/production/definitions/work-centers">Listeye dön</Link></div></header>
    {canManage ? <><section className={ui.surface}><form action={updateWorkCenterAction} className={ui.formShell}><input type="hidden" name="id" value={item.id}/><div className={ui.formGrid}><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} defaultValue={item.code}/></label><label className={ui.formField}><span>İş merkezi adı</span><input name="name" required maxLength={160} defaultValue={item.name}/></label><label className={ui.formField}><span>Çalışma takvimi</span><select name="calendarTemplateId" defaultValue={item.calendarTemplateId ?? ""}><option value="">Firma varsayılanı</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label><label className={ui.checkField}><input name="isActive" type="checkbox" defaultChecked={item.isActive}/> Aktif</label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>Açıklama</span><textarea name="description" defaultValue={item.description ?? ""}/></label></div><div className={ui.formActions}><button className={ui.primaryAction}>Değişiklikleri kaydet</button></div></form></section><section className={ui.dangerZone}><div><h3>İş merkezini sil</h3><p>İstasyon veya iş emrinde kullanılan kayıtlar silinemez; pasife alınmalıdır.</p></div><form action={deleteWorkCenterAction}><input type="hidden" name="id" value={item.id}/><button className={ui.dangerAction}>İş merkezini sil</button></form></section></> : <section className={ui.surface}><dl className={ui.detailList}><div className={ui.detailRow}><dt>Kod</dt><dd>{item.code}</dd></div><div className={ui.detailRow}><dt>Takvim</dt><dd>{item.calendarTemplate?.name ?? "Firma varsayılanı"}</dd></div><div className={ui.detailRow}><dt>Durum</dt><dd>{item.isActive ? "Aktif" : "Pasif"}</dd></div><div className={ui.detailRow}><dt>Açıklama</dt><dd>{item.description ?? "—"}</dd></div></dl></section>}
  </div>;
}
