import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { updateDeviceAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { getAccessibleCompanyIds } from "@/lib/access";
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

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const companyIds = await getAccessibleCompanyIds(user);
  const assignedDeviceIds = await prisma.userDeviceAccess.findMany({
    where: { userId: user.id },
    select: { deviceId: true },
  });
  const deviceIds = assignedDeviceIds.map((access) => access.deviceId);
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const selectedDeviceId = typeof searchParams.deviceId === "string" ? searchParams.deviceId : "";

  const devices = await prisma.device.findMany({
    where: {
      ...(deviceIds.length > 0 ? { id: { in: deviceIds } } : { id: "__none__" }),
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
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  const companyIdList = companyIds ?? [];
  const companies =
    companyIdList.length > 0
      ? await prisma.company.findMany({
          where: { id: { in: companyIdList }, isActive: true },
          orderBy: { name: "asc" },
        })
      : [];
  const branches =
    companyIdList.length > 0
      ? await prisma.branch.findMany({
          where: {
            companyId: { in: companyIdList },
            isActive: true,
          },
          include: { company: true },
          orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
        })
      : [];
  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? null;
  const selectedDeviceBranches = selectedDevice
    ? branches.filter((branch) => branch.companyId === selectedDevice.companyId)
    : [];
  const hasSelectedBranchLocation = selectedDeviceBranches.some(
    (branch) => branch.name === selectedDevice?.branchLocation,
  );

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>RFID Cihazlar</p>
          <h1 className={styles.title}>Atanan Cihazlar</h1>
          <p className={styles.subtitle}>
            Super adminin kullanicina ekledigi cihazlari burada gorur, takma adini ve hangi firma/subede
            kullanilacagini belirlersin.
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
                <th>Firma</th>
                <th>MAC Adresi</th>
                <th>Sube/Lokasyon</th>
                <th>Secret Key</th>
                <th>Son Gorulme</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    Firmana atanmis cihaz bulunamadi.
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.name}</td>
                    <td>{device.company?.name ?? "Firma atanmadi"}</td>
                    <td className={styles.monoCell}>{device.macAddress ?? "-"}</td>
                    <td>{device.branchLocation ?? "-"}</td>
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
              <span>Firma</span>
              <select name="companyId" defaultValue={selectedDevice.companyId ?? ""} required>
                <option value="" disabled>Firma sec</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Sube/Lokasyon</span>
              <select name="branchLocation" defaultValue={selectedDevice.branchLocation ?? ""}>
                <option value="">Seciniz</option>
                {selectedDevice.branchLocation && !hasSelectedBranchLocation ? (
                  <option value={selectedDevice.branchLocation}>{selectedDevice.branchLocation}</option>
                ) : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.company.name} / {branch.name}
                  </option>
                ))}
              </select>
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
