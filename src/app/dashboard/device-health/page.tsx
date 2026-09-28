import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { DeviceStatusRefresh } from "@/app/dashboard/device-status-refresh";
import { isDeviceOnline } from "@/lib/device-status";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { deviceScopeWhere } from "@/lib/authorization";
import styles from "../page.module.css";

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
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Cihaz İzleme</p>
          <h1 className={styles.title}>Cihaz Sağlık Ekranı</h1>
          <p className={styles.subtitle}>Çevrimiçi durum, cihazda bekleyen hareketler, saat senkronu ve son gönderim hatası.</p>
        </div>
        <DeviceStatusRefresh />
      </section>

      <section className={styles.metricsGrid}>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><CheckCircle2 size={18} /></span><p className={styles.metricLabel}>Çevrimiçi</p><p className={styles.metricValue}>{onlineCount}/{devices.length}</p></article>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><Database size={18} /></span><p className={styles.metricLabel}>Bekleyen Kayıt</p><p className={styles.metricValue}>{pendingCount}</p></article>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><AlertTriangle size={18} /></span><p className={styles.metricLabel}>Dikkat Gerektiren</p><p className={styles.metricValue}>{errorCount}</p></article>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Canlı telemetri</p><h2 className={styles.sectionTitle}>Cihazlar</h2></div><div className={styles.countPill}>{devices.length} cihaz</div></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Cihaz / Firma</th><th>Bağlantı</th><th>Bekleyen</th><th>En Eski Kayıt</th><th>Saat Durumu</th><th>Son Başarılı Gönderim</th><th>Son Hata</th><th>Firmware</th></tr></thead>
            <tbody>
              {devices.length === 0 ? <tr><td colSpan={8} className={styles.emptyCell}>Atanmış cihaz bulunamadı.</td></tr> : devices.map((device) => {
                const online = isDeviceOnline(device.lastSeenAt);
                const clockHealthy = device.clockSynchronized === true && Math.abs(device.clockOffsetMinutes ?? 0) <= 2;
                return (
                  <tr key={device.id}>
                    <td><strong>{device.name}</strong><p className={styles.tableSubText}>{device.company?.name ?? "Firma yok"} · {device.branchLocation ?? "Şube yok"}</p></td>
                    <td><span className={online ? styles.reportBadgeSuccess : styles.reportBadgeDanger}>{online ? "Çevrimiçi" : "Çevrimdışı"}</span><p className={styles.tableSubText}>{formatDate(device.lastSeenAt)}</p></td>
                    <td><strong>{device.pendingQueueCount ?? "—"}</strong></td>
                    <td>{formatDate(device.oldestQueuedAt)}</td>
                    <td>{device.clockSynchronized === null ? "Telemetri yok" : <span className={clockHealthy ? styles.reportBadgeSuccess : styles.reportBadgeDanger}>{clockHealthy ? "Senkron" : "Kontrol gerekli"}</span>}<p className={styles.tableSubText}>{device.clockOffsetMinutes === null ? "Fark bilinmiyor" : `${device.clockOffsetMinutes} dk fark`}</p></td>
                    <td>{formatDate(device.lastDataTransferAt)}</td>
                    <td>{device.lastSendError ? <span className={styles.reportBadgeDanger}>{device.lastSendError}</span> : <span className={styles.reportBadgeSuccess}>Hata yok</span>}</td>
                    <td>{device.firmwareVersion ?? "—"}<p className={styles.tableSubText}>Sağlık: {formatDate(device.healthReportedAt)}</p></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.helperText}><RefreshCw size={14} /> Yeni telemetri alanları, güncel cihaz firmware’i heartbeat gönderdiğinde dolacaktır. Eski firmware kullanan cihazlarda “Telemetri yok” görünmesi normaldir.</p>
      </section>
    </div>
  );
}
