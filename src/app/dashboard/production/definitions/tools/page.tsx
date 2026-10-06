import Link from "next/link";
import { Plus, Search, Wrench } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { queryRepository } from "@/modules/shared/query-repository";
import ui from "../../../management.module.css";

const columns: DataTableColumn[] = [
  { id: "tool", label: "Kalıp / ekipman", valueKey: "name", secondaryKey: "code", kind: "stack" },
  { id: "type", label: "Tür", valueKey: "toolType" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const query = (await searchParams).q?.trim() ?? "";
  const canManage = authorization.isPlatformAdmin || authorization.permissions.has(PERMISSIONS.WORK_CENTER_MANAGE);
  const items = await queryRepository.productionTool.findMany({
    where: { companyId: authorization.companyId, ...(query ? { OR: [{ code: { contains: query } }, { name: { contains: query } }, { toolType: { contains: query } }] } : {}) },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Üretim · Sabit Tanımlar</p><h1 className={ui.pageTitle}>Kalıp ve Ekipman</h1><p className={ui.pageDescription}>Üretimde kullanılan kalıp, aparat ve ekipman kayıtlarını yönetin.</p></div>{canManage ? <div className={ui.headerActions}><Link className={ui.primaryAction} href="/dashboard/production/definitions/tools/new"><Plus size={16}/>Yeni tanımla</Link></div> : null}</header>
    <section className={ui.surface} aria-label="Kalıp ve ekipman arama"><form className={ui.searchFilterBar}><label className={ui.field}><span className={ui.fieldLabel}>Kalıp veya ekipman ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16}/><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Kod, ad veya tür"/></span></label><button className={ui.filterButton}>Ara</button></form></section>
    <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Tanımlı kalıp ve ekipmanlar</h2><p><Wrench size={14}/> Çevrim standartlarında ve iş emirlerinde kullanılabilen kaynaklar</p></div><span className={ui.countBadge}>{items.length} kayıt</span></div><ReorderableDataTable rows={items.map((item) => ({ id: item.id, name: item.name, code: item.code, toolType: item.toolType ?? "Tür belirtilmedi", status: item.isActive ? "Aktif" : "Pasif", statusTone: item.isActive ? "success" : "warning", actionLabel: "İncele", actionHref: `/dashboard/production/definitions/tools/${item.id}` }))} columns={columns} storageKey="production-tools-columns-v1" filename="kalip-ve-ekipmanlar" emptyMessage="Aramanıza uygun kalıp veya ekipman bulunamadı." minWidth={700}/></section>
  </div>;
}
