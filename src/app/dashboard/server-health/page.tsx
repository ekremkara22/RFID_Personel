import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Server,
  Wifi,
} from "lucide-react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { getServerHealthSnapshot } from "@/lib/server-health";
import type { HealthLevel } from "@/lib/server-health-rules";
import ui from "../management.module.css";
import { HealthRefresh } from "./health-refresh";
import styles from "./server-health.module.css";

const healthLabels: Record<HealthLevel, string> = {
  healthy: "Sağlıklı",
  warning: "Kontrol edilmeli",
  critical: "Kritik",
  unknown: "Bilinmiyor",
};

function formatBytes(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) return "Bilinmiyor";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "Bilinmiyor";
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days} gün ${hours} sa`;
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(date)
    : "Henüz kayıt yok";
}

function StatusPill({ level }: { level: HealthLevel }) {
  return (
    <span className={styles.statusPill} data-level={level}>
      {level === "healthy" ? <CheckCircle2 size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}
      {healthLabels[level]}
    </span>
  );
}

function Progress({ value, level, label }: { value: number | null; level: HealthLevel; label: string }) {
  return (
    <div className={styles.progressTrack} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
      <div className={styles.progressBar} data-level={level} style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} />
    </div>
  );
}

export default async function ServerHealthPage() {
  await connection();
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") redirect("/dashboard");

  const health = await getServerHealthSnapshot();
  const notices = health.notices.length > 0
    ? health.notices
    : [{ level: "healthy" as const, title: "Temel servisler normal çalışıyor", description: "Sunucu kaynakları ve veritabanı ölçümleri tanımlı eşiklerin altında." }];

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Platform İzleme</p>
          <h1 className={ui.pageTitle}>Sunucu Durumu</h1>
          <p className={ui.pageDescription}>Uygulama sunucusu, veritabanı ve temel PDKS veri akışının güncel sağlık özeti.</p>
        </div>
        <div className={ui.headerActions}>
          <StatusPill level={health.overallLevel} />
          <HealthRefresh />
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label="Sunucu sağlık özeti">
        <article className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><Server size={18} aria-hidden="true" /></span><StatusPill level="healthy" /></div>
          <p className={styles.summaryLabel}>Uygulama</p>
          <p className={styles.summaryValue}>Çalışıyor</p>
          <p className={styles.summaryHelp}>{health.server.environment} ortamı · {formatDuration(health.server.applicationUptimeSeconds)} kesintisiz</p>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><Database size={18} aria-hidden="true" /></span><StatusPill level={health.database.level} /></div>
          <p className={styles.summaryLabel}>Veritabanı</p>
          <p className={styles.summaryValue}>{health.database.connected ? `${health.database.latencyMs} ms` : "Erişilemiyor"}</p>
          <p className={styles.summaryHelp}>{health.database.connected ? `${health.database.connections}/${health.database.maxConnections} bağlantı` : "Bağlantı kontrol edilmeli"}</p>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><MemoryStick size={18} aria-hidden="true" /></span><StatusPill level={health.server.memoryLevel} /></div>
          <p className={styles.summaryLabel}>Sunucu belleği</p>
          <p className={styles.summaryValue}>%{health.server.memoryUsedPercent ?? "—"}</p>
          <p className={styles.summaryHelp}>{formatBytes(health.server.usedMemoryBytes)} / {formatBytes(health.server.totalMemoryBytes)}</p>
          <Progress value={health.server.memoryUsedPercent} level={health.server.memoryLevel} label="Sunucu bellek kullanımı" />
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><HardDrive size={18} aria-hidden="true" /></span><StatusPill level={health.server.diskLevel} /></div>
          <p className={styles.summaryLabel}>Disk kullanımı</p>
          <p className={styles.summaryValue}>{health.server.disk ? `%${health.server.disk.usedPercent}` : "Bilinmiyor"}</p>
          <p className={styles.summaryHelp}>{health.server.disk ? `${formatBytes(health.server.disk.freeBytes)} boş alan` : "Disk bilgisi okunamadı"}</p>
          <Progress value={health.server.disk?.usedPercent ?? null} level={health.server.diskLevel} label="Disk kullanımı" />
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><Wifi size={18} aria-hidden="true" /></span><StatusPill level={health.internet.level} /></div>
          <p className={styles.summaryLabel}>İnternet bağlantısı</p>
          <p className={styles.summaryValue}>{health.internet.available ? `${health.internet.downloadMbps} Mbps` : "Ölçülemedi"}</p>
          <p className={styles.summaryHelp}>{health.internet.available ? `Yükleme ${health.internet.uploadMbps} Mbps · ${health.internet.latencyMs} ms` : "Dış ağ bağlantısı kontrol edilmeli"}</p>
        </article>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Önemli noktalar</h2><p>Kritik ve dikkat gerektiren durumların kısa özeti</p></div><span className={ui.countBadge}>{health.notices.length}</span></div>
        <div className={styles.noticeList}>
          {notices.map((notice, index) => (
            <article key={`${notice.title}-${index}`} className={styles.noticeItem} data-level={notice.level}>
              {notice.level === "healthy" ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
              <div><strong>{notice.title}</strong><p>{notice.description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.detailHeader}><Cpu size={18} aria-hidden="true" /><h2>Sunucu ve uygulama</h2></div>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Ortam</dt><dd>{health.server.environment}</dd></div>
            <div className={styles.detailRow}><dt>İşletim sistemi</dt><dd>{health.server.platform}</dd></div>
            <div className={styles.detailRow}><dt>Node.js</dt><dd>{health.server.nodeVersion}</dd></div>
            <div className={styles.detailRow}><dt>Sunucu çalışma süresi</dt><dd>{formatDuration(health.server.serverUptimeSeconds)}</dd></div>
            <div className={styles.detailRow}><dt>Uygulama çalışma süresi</dt><dd>{formatDuration(health.server.applicationUptimeSeconds)}</dd></div>
            <div className={styles.detailRow}><dt>CPU / 1 dk yük</dt><dd>{health.server.cpuCount} çekirdek · %{health.server.cpuLoadPercent}</dd></div>
            <div className={styles.detailRow}><dt>Uygulama bellek kullanımı</dt><dd>{formatBytes(health.server.processRssBytes)}</dd></div>
            <div className={styles.detailRow}><dt>JavaScript heap</dt><dd>{formatBytes(health.server.processHeapUsedBytes)}</dd></div>
          </dl>
        </article>

        <article className={styles.detailCard}>
          <div className={styles.detailHeader}><Database size={18} aria-hidden="true" /><h2>Veritabanı ayrıntıları</h2></div>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Bağlantı</dt><dd>{health.database.connected ? "Kuruldu" : "Kurulamadı"}</dd></div>
            <div className={styles.detailRow}><dt>Sürüm</dt><dd>{health.database.version}</dd></div>
            <div className={styles.detailRow}><dt>Veri boyutu</dt><dd>{formatBytes(health.database.sizeBytes)}</dd></div>
            <div className={styles.detailRow}><dt>Tablo / tahmini satır</dt><dd>{health.database.tableCount} / {health.database.estimatedRows.toLocaleString("tr-TR")}</dd></div>
            <div className={styles.detailRow}><dt>Bağlantılar</dt><dd>{health.database.connections} / {health.database.maxConnections}</dd></div>
            <div className={styles.detailRow}><dt>Çalışan sorgu iş parçacığı</dt><dd>{health.database.runningThreads}</dd></div>
            <div className={styles.detailRow}><dt>Veritabanı çalışma süresi</dt><dd>{formatDuration(health.database.uptimeSeconds)}</dd></div>
            <div className={styles.detailRow}><dt>Toplam yavaş sorgu</dt><dd>{health.database.slowQueries.toLocaleString("tr-TR")}</dd></div>
          </dl>
          <Progress value={health.database.connectionUsedPercent} level={health.database.connectionLevel} label="Veritabanı bağlantı kullanımı" />
          <p className={styles.detailHelp}>Bağlantı kapasitesinin %{health.database.connectionUsedPercent ?? 0} kadarı kullanımda.</p>
        </article>

        <article className={styles.detailCard}>
          <div className={styles.detailHeader}><Wifi size={18} aria-hidden="true" /><h2>İnternet bağlantısı</h2></div>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Bağlantı</dt><dd>{health.internet.available ? "Erişilebilir" : "Ölçülemedi"}</dd></div>
            <div className={styles.detailRow}><dt>İndirme hızı</dt><dd>{health.internet.downloadMbps === null ? "—" : `${health.internet.downloadMbps} Mbps`}</dd></div>
            <div className={styles.detailRow}><dt>Yükleme hızı</dt><dd>{health.internet.uploadMbps === null ? "—" : `${health.internet.uploadMbps} Mbps`}</dd></div>
            <div className={styles.detailRow}><dt>Gecikme</dt><dd>{health.internet.latencyMs === null ? "—" : `${health.internet.latencyMs} ms`}</dd></div>
            <div className={styles.detailRow}><dt>Ölçüm zamanı</dt><dd>{formatDate(health.internet.measuredAt)}</dd></div>
            <div className={styles.detailRow}><dt>Sonraki ölçüm</dt><dd>{formatDate(health.internet.cachedUntil)}</dd></div>
          </dl>
          <p className={styles.detailHelp}>Cloudflare ağına 5 MB indirme ve 1 MB yükleme örneğiyle ölçülür; sonuç 15 dakika önbellekte tutulur.</p>
        </article>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>PDKS veri akışı</h2><p>Temel kayıt hacimleri ve son hareket bilgileri</p></div><Activity size={18} aria-hidden="true" /></div>
        <div className={styles.applicationGrid}>
          <article className={styles.applicationCard}><p className={styles.applicationLabel}>Firma / kullanıcı</p><p className={styles.applicationValue}>{health.application.companies} / {health.application.users}</p><p className={styles.applicationHelp}>Sistemdeki toplam kayıtlar</p></article>
          <article className={styles.applicationCard}><p className={styles.applicationLabel}>Aktif personel</p><p className={styles.applicationValue}>{health.application.activeEmployees}</p><p className={styles.applicationHelp}>Aktif çalışma kaydı</p></article>
          <article className={styles.applicationCard}><p className={styles.applicationLabel}>Çevrimiçi cihaz</p><p className={styles.applicationValue}>{health.application.onlineDevices} / {health.application.devices}</p><p className={styles.applicationHelp}>{health.application.queuedDeviceRecords} bekleyen hareket</p></article>
          <article className={styles.applicationCard}><p className={styles.applicationLabel}>Son 24 saat hareketi</p><p className={styles.applicationValue}>{health.application.movementsLast24Hours}</p><p className={styles.applicationHelp}>Son kayıt: {formatDate(health.application.latestMovementAt)}</p></article>
        </div>
      </section>

      <p className={styles.detailHelp}>Son ölçüm: {formatDate(health.generatedAt)} · Sayfa açıkken bilgiler 30 saniyede bir yenilenir. Gizli bağlantı bilgileri bu ekranda gösterilmez.</p>
    </div>
  );
}
