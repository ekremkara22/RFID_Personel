import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { updateDeviceAction } from "@/app/dashboard/actions";
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
    devices.find((device) => device.id === selectedDeviceId) ?? null;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>RFID Cihazlar</p>
          <h1 className={styles.title}>Atanan Cihazlar</h1>
          <p className={styles.subtitle}>
            Cihazlari super admin firmana atar. Bu ekranda cihaz bilgilerini gorebilir ve kendi
            kullanacagin cihaz adini duzenleyebilirsin.
          </p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <Search size={18} />
            <input name="q" defaultValue={query} placeholder="Cihaz arama: ad, MAC veya secret key" />
            <button type="submit">Ara</button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cihaz Adi</th>
                <th>MAC Adresi</th>
                <th>Secret Key</th>
                <th>Son Gorulme</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Firmana atanmis cihaz bulunamadi.
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.name}</td>
                    <td className={styles.monoCell}>{device.macAddress ?? "-"}</td>
                    <td className={styles.monoCell}>{device.secretKey}</td>
                    <td>{device.lastSeenAt ? formatDate(device.lastSeenAt) : "Henuz yok"}</td>
                    <td>
                      <Link href={buildDeviceUrl(query, device.id)} className={styles.inlineAction}>
                        <Eye size={16} />
                        <span>Incele</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedDevice ? (
        <section className={`glass-panel ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Cihaz Detayi</p>
              <h2 className={styles.sectionTitle}>{selectedDevice.name}</h2>
            </div>
          </div>

          <form action={updateDeviceAction} className={styles.formGrid}>
            <input type="hidden" name="deviceId" value={selectedDevice.id} />

            <label className={styles.field}>
              <span>Cihaz Adi</span>
              <input name="name" defaultValue={selectedDevice.name} required />
            </label>

            <label className={styles.field}>
              <span>MAC Adresi</span>
              <input value={selectedDevice.macAddress ?? ""} readOnly />
            </label>

            <label className={styles.field}>
              <span>Secret Key</span>
              <input value={selectedDevice.secretKey} readOnly />
            </label>

            <label className={styles.field}>
              <span>Son Gorulme</span>
              <input value={selectedDevice.lastSeenAt ? formatDate(selectedDevice.lastSeenAt) : "Henuz yok"} readOnly />
            </label>

            <div className={styles.fullWidth}>
              <SubmitButton
                idleLabel="Cihaz Adini Guncelle"
                pendingLabel="Guncelleniyor..."
                className={styles.primaryButton}
              />
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
