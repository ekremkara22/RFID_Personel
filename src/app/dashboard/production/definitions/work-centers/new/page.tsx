import Link from "next/link";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createWorkCenterAction } from "@/modules/production/actions";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../../management.module.css";

export default async function NewWorkCenterPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const calendars = await queryRepository.workCalendarTemplate.findMany({ where: { companyId: authorization.companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>İş Merkezleri</p><h1 className={ui.pageTitle}>Yeni iş merkezi tanımla</h1><p className={ui.pageDescription}>İş merkezinin temel bilgilerini ve kullanılacak çalışma takvimini belirleyin.</p></div><div className={ui.headerActions}><Link className={ui.secondaryAction} href="/dashboard/production/definitions/work-centers">Listeye dön</Link></div></header>
    <section className={ui.surface}><form action={createWorkCenterAction} className={ui.formShell}><div className={ui.formGrid}><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} placeholder="IM-001"/></label><label className={ui.formField}><span>İş merkezi adı</span><input name="name" required maxLength={160} placeholder="Enjeksiyon"/></label><label className={ui.formField}><span>Çalışma takvimi</span><select name="calendarTemplateId"><option value="">Firma varsayılanı</option>{calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>Açıklama</span><textarea name="description" maxLength={2000} placeholder="İsteğe bağlı açıklama"/></label></div><div className={ui.formActions}><button className={ui.primaryAction}>İş merkezini kaydet</button></div></form></section>
  </div>;
}
