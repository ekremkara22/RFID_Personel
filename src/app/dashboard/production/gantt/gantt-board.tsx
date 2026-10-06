"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveWorkOrderAction } from "@/modules/production/actions";
import styles from "../production.module.css";

export type GanttOrder = { id: number; workOrderNo: string; orderNo: string | null; itemCode: string; quantity: string; calculatedMinutes: number; dueDate: string | null; isScheduleLocked: boolean };
export type GanttLane = { id: number; name: string; code: string; workCenterName: string; orders: GanttOrder[] };

export function GanttBoard({ lanes }: { lanes: GanttLane[] }) {
  const router = useRouter();
  const [currentLanes, setCurrentLanes] = useState(lanes);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const drop = (targetStationId: number, beforeId: number | null) => {
    if (!draggedId) return;
    const workOrder = currentLanes.flatMap((lane) => lane.orders).find((item) => item.id === draggedId);
    if (!workOrder || workOrder.isScheduleLocked) return;
    setCurrentLanes((previous) => {
      const removed = previous.map((lane) => ({ ...lane, orders: lane.orders.filter((order) => order.id !== draggedId) }));
      return removed.map((lane) => lane.id === targetStationId ? { ...lane, orders: [...lane.orders.slice(0, beforeId ? lane.orders.findIndex((order) => order.id === beforeId) : lane.orders.length), workOrder, ...lane.orders.slice(beforeId ? Math.max(0, lane.orders.findIndex((order) => order.id === beforeId)) : lane.orders.length)] } : lane);
    });
    const movedId = draggedId;
    setDraggedId(null);
    startTransition(async () => { await moveWorkOrderAction(movedId, targetStationId, beforeId); router.refresh(); });
  };
  return <div className={styles.ganttBoard} aria-busy={isPending}>
    <div className={styles.ganttScale}><span>İstasyon</span><span>Kuyruk sırası ve tahmini makine süresi</span></div>
    {currentLanes.map((lane) => <section key={lane.id} className={styles.ganttLane} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(lane.id, null)}>
      <header><strong>{lane.name}</strong><span>{lane.workCenterName} · {lane.code}</span></header>
      <div className={styles.ganttTrack}>{lane.orders.length === 0 ? <button type="button" className={styles.ganttEmpty} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(lane.id, null)}>İşi buraya bırakın</button> : lane.orders.map((order) => <article key={order.id} draggable={!order.isScheduleLocked} onDragStart={() => setDraggedId(order.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); drop(lane.id, order.id); }} className={`${styles.ganttTask} ${order.isScheduleLocked ? styles.ganttTaskLocked : ""}`} tabIndex={0} aria-label={`${order.workOrderNo}, ${order.calculatedMinutes} dakika`}><strong>{order.workOrderNo}</strong><span>{order.itemCode} · {order.quantity} adet</span><small>{order.calculatedMinutes} dk {order.dueDate ? `· Termin ${new Intl.DateTimeFormat("tr-TR").format(new Date(order.dueDate))}` : ""}</small></article>)}</div>
    </section>)}
  </div>;
}
