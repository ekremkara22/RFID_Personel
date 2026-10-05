import Link from "next/link";
import { GripVertical } from "lucide-react";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { GanttBoard, type GanttLane } from "./gantt-board";
import ui from "../../management.module.css";

export default async function GanttPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.CAPACITY_VIEW);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const stations = await prisma.productionStation.findMany({
    where: { companyId: authorization.companyId, isActive: true, workCenter: { isActive: true } },
    include: { workCenter: { select: { name: true } }, workOrders: { where: { status: { in: ["DRAFT", "PLANNED"] } }, orderBy: [{ sequence: "asc" }, { id: "asc" }] } },
    orderBy: [{ workCenter: { name: "asc" } }, { name: "asc" }],
  });
  const lanes: GanttLane[] = stations.map((station) => ({ id: station.id, name: station.name, code: station.code, workCenterName: station.workCenter.name, orders: station.workOrders.map((order) => ({ id: order.id, workOrderNo: order.workOrderNo, orderNo: order.orderNo, itemCode: order.itemCode, quantity: order.quantity.toString(), calculatedMinutes: order.calculatedMinutes, dueDate: order.dueDate?.toISOString() ?? null, isScheduleLocked: order.isScheduleLocked })) }));
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Kapasite planlama</p><h1 className={ui.pageTitle}>İstasyon Bazlı Gantt</h1><p className={ui.pageDescription}>İşleri istasyon içinde yeniden sıralayın veya uygun istasyona taşıyın. Süre, kaydedilmiş çevrim standardı üzerinden gösterilir.</p></div><div className={ui.headerActions}><Link href="/dashboard/production/work-orders" className={ui.secondaryAction}>İş emirleri</Link></div></header>
    <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Planlama kuyruğu</h2><p><GripVertical size={14}/> Bir kartı sürükleyip başka bir kartın önüne veya istasyonun boş alanına bırakın.</p></div><span className={ui.statusNeutral}>{lanes.length} aktif istasyon</span></div><GanttBoard lanes={lanes}/></section>
  </div>;
}
