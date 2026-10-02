import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { DeviceStatusRefresh } from "@/app/dashboard/device-status-refresh";
import { can, deviceScopeWhere } from "@/lib/authorization";
import { isDeviceOnline } from "@/lib/device-status";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import ui from "../management.module.css";
import styles from "../page.module.css";
import { DeviceHealthTable } from "./device-health-table";

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium" }).format(date);
}

export default async function DeviceHealthPage() {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");

  const devices = await prisma.device.findMany({
    where: deviceScopeWhere(authorization),
    include: { company: true },
    orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
  });
  const onlineCount = devices.filter((device) => isDeviceOnline(device.lastSeenAt)).length;
  const pendingCount = devices.reduce((total, device) => total + (device.pendingQueueCount ?? 0), 0);
  const errorCount = devices.filter((device) => device.lastSendError || device.clockSynchronized === false).length;

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Canlı cihaz izleme</p>
          <h1 className={ui.pageTitle}>Cihaz Sağlığı</h1>
          <p className={ui.pageDescription}>RFID okuyucularının bağlantısını, bekleyen kayıtlarını, saat durumunu ve son aktarım hatalarını izleyin.</p>
        </div>
        <DeviceStatusRefresh />
      </header>

      <section className={ui.summaryGrid}>
        <article className={ui.summaryCard}><span className={ui.summaryIcon}><CheckCircle2 size={18} /></span><p className={ui.summaryLabel}>Çevrimiçi cihaz</p><p className={ui.summaryValue}>{onlineCount}/{devices.length}</p></article>
        <article className={ui.summaryCard}><span className={ui.summaryIcon}><Database size={18} /></span><p className={ui.summaryLabel}>Bekleyen kayıt</p><p className={ui.summaryValue}>{pendingCount}</p></article>
        <article className={ui.summaryCard}><span className={ui.summaryIcon}><AlertTriangle size={18} /></span><p className={ui.summaryLabel}>Dikkat gerektiren</p><p className={ui.summaryValue}>{errorCount}</p></article>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Canlı telemetri</h2><p>Bağlantı, kuyruk, saat ve firmware verileri</p></div><span className={ui.countBadge}>{devices.length} cihaz</span></div>
        <DeviceHealthTable
          canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)}
          rows={devices.map((device) => {
            const online = isDeviceOnline(device.lastSeenAt);
            const clockHealthy = device.clockSynchronized === true && Math.abs(device.clockOffsetMinutes ?? 0) <= 2;
            return {
              id: device.id,
              name: device.name,
              organization: `${device.company?.name ?? "Firma yok"} · ${device.branchLocation ?? "Şube yok"}`,
              connection: online ? "Çevrimiçi" : "Çevrimdışı",
              connectionTone: online ? "success" : "danger",
              lastSeen: `Son görülme: ${formatDate(device.lastSeenAt)}`,
              pending: device.pendingQueueCount ?? "—",
              oldestQueued: `En eski: ${formatDate(device.oldestQueuedAt)}`,
              clock: device.clockSynchronized === null ? "Telemetri yok" : clockHealthy ? "Senkron" : "Kontrol gerekli",
              clockTone: device.clockSynchronized === null ? "neutral" : clockHealthy ? "success" : "danger",
              clockOffset: device.clockOffsetMinutes === null ? "Fark bilinmiyor" : `${device.clockOffsetMinutes} dk fark`,
              lastTransfer: formatDate(device.lastDataTransferAt),
              lastError: device.lastSendError || "Hata yok",
              errorTone: device.lastSendError ? "danger" : "success",
              firmware: device.firmwareVersion ?? "Bilinmiyor",
              healthReported: `Sağlık: ${formatDate(device.healthReportedAt)}`,
            };
          })}
        />
        <p className={ui.helpText}><RefreshCw size={14} /> Telemetri alanları güncel cihaz yazılımı heartbeat gönderdiğinde dolar. Eski yazılım kullanan cihazlarda “Telemetri yok” görünmesi normaldir.</p>
      </section>
    </div>
  );
}
