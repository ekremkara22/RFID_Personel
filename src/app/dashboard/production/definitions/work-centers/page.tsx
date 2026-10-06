import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../management.module.css";

const columns: DataTableColumn[] = [
  { id: "center", label: "İş merkezi", valueKey: "name", secondaryKey: "code", kind: "stack" },
  { id: "calendar", label: "Çalışma takvimi", valueKey: "calendarName" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export default async function WorkCentersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const query = (await searchParams).q?.trim() ?? "";
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  const items = await queryRepository.productionWorkCenter.findMany({
    where: { companyId: authorization.companyId, ...(query ? { OR: [{ code: { contains: query } }, { name: { contains: query } }] } : {}) },
    include: { calendarTemplate: { select: { name: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}>
      <div className={ui.headerCopy}><p className={ui.kicker}>Üretim · Sabit Tanımlar</p><h1 className={ui.pageTitle}>İş Merkezleri</h1><p className={ui.pageDescription}>Üretim kaynaklarını arayın, tanımlayın ve detay ekranından yönetin.</p></div>
      {canManage ? <div className={ui.headerActions}><Link className={ui.primaryAction} href="/dashboard/production/definitions/work-centers/new"><Plus size={16}/>Yeni tanımla</Link></div> : null}
    </header>
    <section className={ui.surface} aria-label="İş merkezi arama">
      <form className={ui.searchFilterBar}><label className={ui.field}><span className={ui.fieldLabel}>İş merkezi ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16}/><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Kod veya ad"/></span></label><button className={ui.filterButton}>Ara</button></form>
    </section>
    <section className={ui.surface}>
      <div className={ui.sectionHeading}><div><h2>Tanımlı iş merkezleri</h2><p><Building2 size={14}/> Üretim organizasyonundaki ana kaynak grupları</p></div><span className={ui.countBadge}>{items.length} kayıt</span></div>
      <ReorderableDataTable rows={items.map((item) => ({ id: item.id, name: item.name, code: item.code, calendarName: item.calendarTemplate?.name ?? "Firma varsayılanı", status: item.isActive ? "Aktif" : "Pasif", statusTone: item.isActive ? "success" : "warning", actionLabel: "İncele", actionHref: `/dashboard/production/definitions/work-centers/${item.id}` }))} columns={columns} storageKey="production-work-centers-columns-v1" filename="is-merkezleri" emptyMessage="Aramanıza uygun iş merkezi bulunamadı." minWidth={720}/>
    </section>
  </div>;
}
