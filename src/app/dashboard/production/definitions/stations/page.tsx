import Link from "next/link";
import { Factory, Plus, Search } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { productionStationTypeLabel } from "@/modules/production/labels";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../management.module.css";

const columns: DataTableColumn[] = [
  { id: "station", label: "İstasyon", valueKey: "name", secondaryKey: "code", kind: "stack" },
  { id: "workCenter", label: "İş merkezi", valueKey: "workCenterName" },
  { id: "type", label: "İstasyon türü", valueKey: "stationType" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export default async function StationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const query = (await searchParams).q?.trim() ?? "";
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  const items = await queryRepository.productionStation.findMany({
    where: { companyId: authorization.companyId, ...(query ? { OR: [{ code: { contains: query } }, { name: { contains: query } }, { workCenter: { name: { contains: query } } }] } : {}) },
    include: { workCenter: { select: { name: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Üretim · Sabit Tanımlar</p><h1 className={ui.pageTitle}>İstasyonlar</h1><p className={ui.pageDescription}>İş merkezlerine bağlı makine ve üretim istasyonlarını yönetin.</p></div>{canManage ? <div className={ui.headerActions}><Link className={ui.primaryAction} href="/dashboard/production/definitions/stations/new"><Plus size={16}/>Yeni tanımla</Link></div> : null}</header>
    <section className={ui.surface} aria-label="İstasyon arama"><form className={ui.searchFilterBar}><label className={ui.field}><span className={ui.fieldLabel}>İstasyon ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16}/><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Kod, ad veya iş merkezi"/></span></label><button className={ui.filterButton}>Ara</button></form></section>
    <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Tanımlı istasyonlar</h2><p><Factory size={14}/> Üretim planına atanabilecek aktif ve pasif istasyonlar</p></div><span className={ui.countBadge}>{items.length} kayıt</span></div><ReorderableDataTable rows={items.map((item) => ({ id: item.id, name: item.name, code: item.code, workCenterName: item.workCenter.name, stationType: productionStationTypeLabel(item.stationType), status: item.isActive ? "Aktif" : "Pasif", statusTone: item.isActive ? "success" : "warning", actionLabel: "İncele", actionHref: `/dashboard/production/definitions/stations/${item.id}` }))} columns={columns} storageKey="production-stations-columns-v1" filename="istasyonlar" emptyMessage="Aramanıza uygun istasyon bulunamadı." minWidth={780}/></section>
  </div>;
}
