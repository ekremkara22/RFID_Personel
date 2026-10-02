import { statfs } from "node:fs/promises";
import os from "node:os";
import { isDeviceOnline } from "@/lib/device-status";
import { getInternetSpeedSnapshot } from "@/lib/internet-speed";
import { prisma } from "@/lib/prisma";
import {
  latencyHealthLevel,
  overallHealthLevel,
  type HealthLevel,
  usageHealthLevel,
} from "@/lib/server-health-rules";

type NumericValue = bigint | number | string | null;

type DatabaseSizeRow = {
  sizeBytes: NumericValue;
  tableCount: NumericValue;
  estimatedRows: NumericValue;
};

type DatabaseVersionRow = { version: string };
type DatabaseConnectionRow = { maxConnections: NumericValue };
type DatabaseStatusRow = { Variable_name: string; Value: string };

function toNumber(value: NumericValue) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function percent(used: number, total: number) {
  return total > 0 ? Math.round((used / total) * 1000) / 10 : null;
}

async function getDiskSnapshot() {
  try {
    const stats = await statfs(process.cwd());
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bavail * stats.bsize;
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    return { totalBytes, freeBytes, usedBytes, usedPercent: percent(usedBytes, totalBytes) };
  } catch {
    return null;
  }
}

export async function getServerHealthSnapshot() {
  const generatedAt = new Date();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);
  const memoryUsedPercent = percent(usedMemoryBytes, totalMemoryBytes);
  const cpuCount = Math.max(1, os.cpus().length);
  const loadAverage = os.loadavg()[0];
  const cpuLoadPercent = Math.round((loadAverage / cpuCount) * 1000) / 10;
  const processMemory = process.memoryUsage();
  const [disk, internet] = await Promise.all([getDiskSnapshot(), getInternetSpeedSnapshot()]);

  let databaseConnected = false;
  let databaseLatencyMs: number | null = null;
  let databaseSizeBytes = 0;
  let databaseTableCount = 0;
  let databaseEstimatedRows = 0;
  let databaseVersion = "Bilinmiyor";
  let databaseConnections = 0;
  let databaseRunningThreads = 0;
  let databaseMaxConnections = 0;
  let databaseUptimeSeconds = 0;
  let databaseSlowQueries = 0;

  try {
    const pingStartedAt = performance.now();
    await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    databaseLatencyMs = Math.max(0, Math.round(performance.now() - pingStartedAt));
    databaseConnected = true;

    const [sizeRows, versionRows, connectionRows, statusRows] = await Promise.all([
      prisma.$queryRawUnsafe<DatabaseSizeRow[]>(
        "SELECT COALESCE(SUM(data_length + index_length), 0) AS sizeBytes, COUNT(*) AS tableCount, COALESCE(SUM(table_rows), 0) AS estimatedRows FROM information_schema.tables WHERE table_schema = DATABASE()",
      ),
      prisma.$queryRawUnsafe<DatabaseVersionRow[]>("SELECT VERSION() AS version"),
      prisma.$queryRawUnsafe<DatabaseConnectionRow[]>("SELECT @@max_connections AS maxConnections"),
      prisma.$queryRawUnsafe<DatabaseStatusRow[]>(
        "SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected', 'Threads_running', 'Slow_queries', 'Uptime')",
      ),
    ]);

    const size = sizeRows[0];
    databaseSizeBytes = toNumber(size?.sizeBytes ?? 0);
    databaseTableCount = toNumber(size?.tableCount ?? 0);
    databaseEstimatedRows = toNumber(size?.estimatedRows ?? 0);
    databaseVersion = versionRows[0]?.version ?? "Bilinmiyor";
    databaseMaxConnections = toNumber(connectionRows[0]?.maxConnections ?? 0);
    const statuses = new Map(statusRows.map((row) => [row.Variable_name, toNumber(row.Value)]));
    databaseConnections = statuses.get("Threads_connected") ?? 0;
    databaseRunningThreads = statuses.get("Threads_running") ?? 0;
    databaseUptimeSeconds = statuses.get("Uptime") ?? 0;
    databaseSlowQueries = statuses.get("Slow_queries") ?? 0;
  } catch {
    databaseConnected = false;
    databaseLatencyMs = null;
  }

  let applicationCounts = {
    companies: 0,
    users: 0,
    activeEmployees: 0,
    devices: 0,
    onlineDevices: 0,
    queuedDeviceRecords: 0,
    movementsLast24Hours: 0,
    latestMovementAt: null as Date | null,
  };

  if (databaseConnected) {
    try {
      const last24Hours = new Date(generatedAt.getTime() - 24 * 60 * 60 * 1000);
      const [companies, users, activeEmployees, devices, movementsLast24Hours, latestMovement] = await Promise.all([
        prisma.company.count(),
        prisma.user.count(),
        prisma.employee.count({ where: { isActive: true } }),
        prisma.device.findMany({ select: { lastSeenAt: true, pendingQueueCount: true } }),
        prisma.attendanceLog.count({ where: { scannedAt: { gte: last24Hours } } }),
        prisma.attendanceLog.findFirst({ select: { scannedAt: true }, orderBy: { scannedAt: "desc" } }),
      ]);
      applicationCounts = {
        companies,
        users,
        activeEmployees,
        devices: devices.length,
        onlineDevices: devices.filter((device) => isDeviceOnline(device.lastSeenAt, generatedAt.getTime())).length,
        queuedDeviceRecords: devices.reduce((sum, device) => sum + (device.pendingQueueCount ?? 0), 0),
        movementsLast24Hours,
        latestMovementAt: latestMovement?.scannedAt ?? null,
      };
    } catch {
      // The database connection is alive; application metrics remain safely unavailable.
    }
  }

  const memoryLevel = usageHealthLevel(memoryUsedPercent);
  const diskLevel = usageHealthLevel(disk?.usedPercent ?? null);
  const databaseLevel = databaseConnected ? latencyHealthLevel(databaseLatencyMs) : "critical";
  const connectionUsedPercent = percent(databaseConnections, databaseMaxConnections);
  const connectionLevel = usageHealthLevel(connectionUsedPercent, 70, 85);
  const overallLevel = overallHealthLevel([memoryLevel, diskLevel, databaseLevel, connectionLevel, internet.level]);

  const notices: Array<{ level: HealthLevel; title: string; description: string }> = [];
  if (!databaseConnected) {
    notices.push({ level: "critical", title: "Veritabanına erişilemiyor", description: "Uygulamanın veritabanı bağlantısı kontrol edilmeli." });
  }
  if (memoryLevel === "warning" || memoryLevel === "critical") {
    notices.push({ level: memoryLevel, title: "Bellek kullanımı yüksek", description: `Sunucu belleğinin %${memoryUsedPercent ?? 0} kadarı kullanımda.` });
  }
  if (diskLevel === "warning" || diskLevel === "critical") {
    notices.push({ level: diskLevel, title: "Disk kullanımı yüksek", description: `Uygulama diskinin %${disk?.usedPercent ?? 0} kadarı kullanımda.` });
  }
  if (databaseLevel === "warning" || (databaseLevel === "critical" && databaseConnected)) {
    notices.push({ level: databaseLevel, title: "Veritabanı yanıtı yavaş", description: `Son sağlık sorgusu ${databaseLatencyMs ?? 0} ms sürdü.` });
  }
  if (connectionLevel === "warning" || connectionLevel === "critical") {
    notices.push({ level: connectionLevel, title: "Veritabanı bağlantı kullanımı yüksek", description: `${databaseConnections}/${databaseMaxConnections} bağlantı kullanımda.` });
  }
  if (applicationCounts.devices > 0 && applicationCounts.onlineDevices < applicationCounts.devices) {
    notices.push({ level: "warning", title: "Çevrimdışı RFID cihazları var", description: `${applicationCounts.devices - applicationCounts.onlineDevices} cihaz şu anda çevrimdışı görünüyor.` });
  }
  if (applicationCounts.queuedDeviceRecords > 0) {
    notices.push({ level: "warning", title: "Cihaz kuyruğunda kayıt var", description: `${applicationCounts.queuedDeviceRecords} hareket henüz sunucuya aktarılmayı bekliyor.` });
  }
  if (!internet.available) {
    notices.push({ level: "critical", title: "İnternet hız testi tamamlanamadı", description: "Sunucunun dış ağ erişimi veya Cloudflare hız testi bağlantısı kontrol edilmeli." });
  } else if (internet.level === "warning" || internet.level === "critical") {
    notices.push({ level: internet.level, title: "İnternet bağlantısı yavaş", description: `Ölçülen hız: ${internet.downloadMbps ?? 0} Mbps indirme, ${internet.uploadMbps ?? 0} Mbps yükleme.` });
  }

  return {
    generatedAt,
    overallLevel,
    notices,
    server: {
      environment: process.env.APP_ENV === "staging" ? "Test" : process.env.NODE_ENV === "production" ? "Canlı" : "Geliştirme",
      platform: `${os.platform()} ${os.arch()}`,
      nodeVersion: process.version,
      serverUptimeSeconds: os.uptime(),
      applicationUptimeSeconds: process.uptime(),
      cpuCount,
      loadAverage,
      cpuLoadPercent,
      totalMemoryBytes,
      freeMemoryBytes,
      usedMemoryBytes,
      memoryUsedPercent,
      processRssBytes: processMemory.rss,
      processHeapUsedBytes: processMemory.heapUsed,
      disk,
      memoryLevel,
      diskLevel,
    },
    database: {
      connected: databaseConnected,
      latencyMs: databaseLatencyMs,
      level: databaseLevel,
      version: databaseVersion,
      sizeBytes: databaseSizeBytes,
      tableCount: databaseTableCount,
      estimatedRows: databaseEstimatedRows,
      connections: databaseConnections,
      runningThreads: databaseRunningThreads,
      maxConnections: databaseMaxConnections,
      connectionUsedPercent,
      connectionLevel,
      uptimeSeconds: databaseUptimeSeconds,
      slowQueries: databaseSlowQueries,
    },
    application: applicationCounts,
    internet,
  };
}
