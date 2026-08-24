import Link from "next/link";
import { redirect } from "next/navigation";
import { createDeviceAction, updateDeviceAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildDeviceUrl(deviceQ: string, deviceId?: string) {
  const params = new URLSearchParams();

  if (deviceQ) {
    params.set("q", deviceQ);
  }

  if (deviceId) {
    params.set("deviceId", deviceId);
  }

  return `/dashboard/devices${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function DevicesPage(props: {
  searchParams: Promise<{ q?: string; deviceId?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const selectedDeviceId = typeof searchParams.deviceId === "string" ? searchParams.deviceId : "";

  const devices = await prisma.device.findMany({
    where: {
      companyId: user.companyId,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { macAddress: { contains: query } },
              { secretKey: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? devices[0] ?? null;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>QR Cihazlar</p>
          <h1 className={styles.title}>Cihaz Yonetimi</h1>
          <p className={styles.subtitle}>
            Cihazlari listbox mantigiyla arayabilir, secili ESP32 cihazinin detayini gorup
            guncelleyebilirsin.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Kayitli Cihazlar</p>
                <h2 className={styles.sectionTitle}>Cihaz Listesi</h2>
              </div>
            </div>

            <form className={styles.searchForm}>
              <input name="q" defaultValue={query} placeholder="Cihaz arama textboxu" />
              <button type="submit">Arama</button>
            </form>

            <div className={styles.listBox}>
              {devices.length === 0 ? (
                <p className={styles.emptyState}>Aramana uygun cihaz bulunamadi.</p>
              ) : (
                devices.map((device) => (
                  <Link
                    key={device.id}
                    href={buildDeviceUrl(query, device.id)}
                    className={selectedDevice?.id === device.id ? styles.listItemActive : styles.listItemLink}
                  >
                    <div>
                      <p className={styles.logTitle}>{device.name}</p>
                      <p className={styles.logMeta}>MAC: {device.macAddress ?? "-"}</p>
                    </div>
                    <div className={styles.logMetaRight}>
                      <p>{device.lastSeenAt ? "Online" : "Bekleniyor"}</p>
                      <p>{device.qrExpiresAt ? `QR: ${formatDate(device.qrExpiresAt)}` : "QR yok"}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Cihaz</p>
                <h2 className={styles.sectionTitle}>ESP32 Kaydi</h2>
              </div>
            </div>

            <form action={createDeviceAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Cihaz Adi</span>
                <input name="name" required placeholder="On Kapi ESP32" />
              </label>

              <label className={styles.field}>
                <span>MAC Adresi</span>
                <input name="macAddress" placeholder="AA-BB-CC-DD-EE-FF" />
              </label>

              <div className={styles.fullWidth}>
                <SubmitButton
                  idleLabel="Cihazi Kaydet"
                  pendingLabel="Kaydediliyor..."
                  className={styles.primaryButton}
                />
              </div>
            </form>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Cihaz Detayi</p>
                <h2 className={styles.sectionTitle}>Secili Cihaz</h2>
              </div>
            </div>

            {selectedDevice ? (
              <form action={updateDeviceAction} className={styles.formGridSingle}>
                <input type="hidden" name="deviceId" value={selectedDevice.id} />

                <label className={styles.field}>
                  <span>Cihaz Adi</span>
                  <input name="name" defaultValue={selectedDevice.name} required />
                </label>

                <label className={styles.field}>
                  <span>MAC Adresi</span>
                  <input name="macAddress" defaultValue={selectedDevice.macAddress ?? ""} />
                </label>

                <div className={styles.detailList}>
                  <p>
                    <span>Secret Key</span>
                    {selectedDevice.secretKey}
                  </p>
                  <p>
                    <span>Aktif QR Token</span>
                    {selectedDevice.activeQrToken ?? "UUID bekleniyor"}
                  </p>
                  <p>
                    <span>QR Bitis</span>
                    {selectedDevice.qrExpiresAt ? formatDate(selectedDevice.qrExpiresAt) : "Sure yok"}
                  </p>
                  <p>
                    <span>Son Gorulme</span>
                    {selectedDevice.lastSeenAt ? formatDate(selectedDevice.lastSeenAt) : "Henuz yok"}
                  </p>
                </div>

                <SubmitButton
                  idleLabel="Cihazi Guncelle"
                  pendingLabel="Guncelleniyor..."
                  className={styles.primaryButton}
                />
              </form>
            ) : (
              <p className={styles.emptyState}>Detay icin listeden cihaz sec.</p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
