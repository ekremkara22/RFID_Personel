import { redirect } from "next/navigation";
import { DeviceStatusRefresh } from "../device-status-refresh";
import { SubmitButton } from "../submit-button";
import styles from "../page.module.css";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { cancelFirmwareDeploymentAction, deployFirmwareAction } from "./actions";
import { FirmwareTargetSelector } from "./target-selector";

const statusLabels = {
  PENDING: "Bekliyor",
  DOWNLOADING: "İndiriliyor",
  INSTALLED: "Başarılı",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
} as const;

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium" }).format(date) : "-";
}

export default async function FirmwareUpdatesPage(props: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") redirect("/dashboard");

  const params = await props.searchParams;
  const [releases, devices, companies, branches, deployments] = await Promise.all([
    prisma.firmwareRelease.findMany({
      include: { createdBy: { select: { firstName: true, lastName: true, name: true, email: true } }, _count: { select: { deployments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.device.findMany({ include: { company: true }, orderBy: [{ company: { name: "asc" } }, { name: "asc" }] }),
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { isActive: true }, include: { company: true }, orderBy: [{ company: { name: "asc" } }, { name: "asc" }] }),
    prisma.firmwareDeployment.findMany({
      include: {
        release: true,
        device: { include: { company: true } },
        createdBy: { select: { firstName: true, lastName: true, name: true, email: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 200,
    }),
  ]);

  const actorName = (actor: { firstName: string | null; lastName: string | null; name: string | null; email: string }) =>
    `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.name || actor.email;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>ESP32 OTA</p>
          <h1 className={styles.title}>Cihaz Yazılım Güncellemeleri</h1>
          <p className={styles.subtitle}>Firmware sürümlerini yükleyin, firma/şube/cihaz bazında dağıtın ve cihazlardan gelen sonucu takip edin.</p>
        </div>
        <DeviceStatusRefresh />
      </section>

      {params.success ? <div className={styles.successNotice}>{params.success}</div> : null}
      {params.error ? <div className={styles.errorNotice}>{params.error}</div> : null}

      <div className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Yeni sürüm</p><h2 className={styles.sectionTitle}>Firmware yükle</h2></div></div>
            <form action="/api/admin/firmware/releases" method="post" encType="multipart/form-data" className={styles.formGrid}>
              <label className={styles.field}><span>Sürüm</span><input name="version" placeholder="1.0.0" required /></label>
              <label className={styles.field}><span>ESP32 .bin dosyası</span><input name="firmware" type="file" accept=".bin,application/octet-stream" required /></label>
              <label className={`${styles.field} ${styles.fullWidth}`}><span>Sürüm notları</span><textarea name="releaseNotes" placeholder="Bu sürümde yapılan değişiklikler" /></label>
              <div className={styles.fullWidth}><button type="submit" className={styles.primaryButton}>Firmware sürümünü yükle</button></div>
            </form>
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Dağıtım</p><h2 className={styles.sectionTitle}>Güncellemeyi başlat</h2></div></div>
            <form action={deployFirmwareAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Firmware sürümü</span>
                <select name="releaseId" required defaultValue="">
                  <option value="" disabled>Sürüm seç</option>
                  {releases.filter((release) => release.isActive).map((release) => <option key={release.id} value={release.id}>{release.version}</option>)}
                </select>
              </label>
              <FirmwareTargetSelector
                companies={companies.map((company) => ({ id: company.id, name: company.name }))}
                branches={branches.map((branch) => ({ id: branch.id, name: branch.name, companyId: branch.companyId, companyName: branch.company.name }))}
                devices={devices.map((device) => ({ id: device.id, name: device.name, companyName: device.company?.name ?? "Firma atanmamış", branchLocation: device.branchLocation }))}
              />
              <div className={styles.fullWidth}><SubmitButton idleLabel="Güncellemeyi başlat" pendingLabel="Dağıtım hazırlanıyor..." className={styles.primaryButton} /></div>
            </form>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Arşiv</p><h2 className={styles.sectionTitle}>Firmware sürümleri</h2></div></div>
            <div className={styles.firmwareReleaseList}>
              {releases.length === 0 ? <p className={styles.mutedRow}>Henüz firmware yüklenmedi.</p> : releases.map((release) => (
                <article key={release.id} className={styles.infoCard}>
                  <div className={styles.infoCardTop}><strong>{release.version}</strong><span className={styles.countPill}>{release._count.deployments} dağıtım</span></div>
                  <p className={styles.infoCardBody}>{release.releaseNotes || "Sürüm notu yok."}</p>
                  <p className={styles.logMeta}>{(release.sizeBytes / 1024).toFixed(1)} KB · SHA-256: <span className={styles.monoCell}>{release.sha256.slice(0, 12)}…</span></p>
                  <p className={styles.logMeta}>{actorName(release.createdBy)} · {formatDate(release.createdAt)}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Cihaz durumu</p><h2 className={styles.sectionTitle}>Son 200 OTA dağıtımı</h2></div></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Cihaz</th><th>Firma / Şube</th><th>Mevcut → Hedef</th><th>Durum</th><th>Son bildirim</th><th>Hata</th><th>İşlemi yapan</th><th>İşlem</th></tr></thead>
            <tbody>
              {deployments.length === 0 ? <tr><td colSpan={8} className={styles.emptyCell}>OTA dağıtımı bulunmuyor.</td></tr> : deployments.map((deployment) => (
                <tr key={deployment.id}>
                  <td>{deployment.device.name}</td>
                  <td>{deployment.device.company?.name ?? "-"}{deployment.device.branchLocation ? ` / ${deployment.device.branchLocation}` : ""}</td>
                  <td>{deployment.device.firmwareVersion ?? "Bilinmiyor"} → {deployment.release.version}</td>
                  <td><span className={styles.statusBadge} data-status={deployment.status}>{statusLabels[deployment.status]}</span></td>
                  <td>{formatDate(deployment.lastReportedAt ?? deployment.requestedAt)}</td>
                  <td>{deployment.lastError ?? "-"}</td>
                  <td>{actorName(deployment.createdBy)}<br /><span className={styles.logMeta}>{formatDate(deployment.createdAt)}</span></td>
                  <td>{deployment.status === "PENDING" || deployment.status === "DOWNLOADING" ? (
                    <form action={cancelFirmwareDeploymentAction}><input type="hidden" name="deploymentId" value={deployment.id} /><button type="submit" className={styles.dangerMiniButton}>İptal</button></form>
                  ) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
