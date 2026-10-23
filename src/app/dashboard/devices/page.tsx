import { redirect } from "next/navigation";
import { ExternalLink, Filter, MonitorSmartphone, Search, ShoppingCart } from "lucide-react";
import { updateDeviceAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { getAccessibleCompanyIds } from "@/lib/access";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import { can, deviceScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { getPanelDeviceOffer } from "@/modules/commerce/repository";
import Link from "next/link";
import styles from "../page.module.css";
import ui from "../management.module.css";
import { DevicesTable } from "./devices-table";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildDeviceUrl(deviceQ: string, deviceId?: number) {
  const params = new URLSearchParams();

  if (deviceQ) {
    params.set("q", deviceQ);
  }

  if (deviceId) {
    params.set("deviceId", String(deviceId));
  }

  return `/dashboard/devices${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function DevicesPage(props: {
  searchParams: Promise<{ q?: string; deviceId?: string }>;
}) {
  const { user, authorization } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const companyIds = await getAccessibleCompanyIds(user);
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const selectedDeviceIdValue = Number(searchParams.deviceId);
  const selectedDeviceId = Number.isSafeInteger(selectedDeviceIdValue) && selectedDeviceIdValue > 0
    ? selectedDeviceIdValue
    : null;

  const devices = await queryRepository.device.findMany({
    where: {
      ...deviceScopeWhere(authorization),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { macAddress: { contains: query } },
              ...(can(authorization, PERMISSIONS.DEVICE_SECRET_VIEW) ? [{ secretKey: { contains: query } }] : []),
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
      ? await queryRepository.company.findMany({
          where: { id: { in: companyIdList }, isActive: true },
          orderBy: { name: "asc" },
        })
      : [];
  const branches =
    companyIdList.length > 0
      ? await queryRepository.branch.findMany({
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
  // Companies without any reader see where to get one; a search with no hits is not that case.
  // Counted company-wide so a member with a narrow device scope is not offered a reader the company already has.
  const companyHasDevice = authorization.companyId ? (await queryRepository.device.count({ where: { companyId: authorization.companyId } })) > 0 : true;
  const deviceOffer = !query && !companyHasDevice ? await getPanelDeviceOffer() : undefined;
  const hasSelectedBranchLocation = selectedDeviceBranches.some(
    (branch) => branch.name === selectedDevice?.branchLocation,
  );

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Cihaz yönetimi</p>
          <h1 className={ui.pageTitle}>RFID Cihazları</h1>
          <p className={ui.pageDescription}>Firmanıza atanmış okuyucuları, bağlantı bilgilerini ve kullanım yerlerini tek ekrandan yönetin.</p>
        </div>
      </header>

      {deviceOffer !== undefined ? (
        <section className={ui.notice}>
          <h2>Henüz firmanıza atanmış bir okuyucu yok</h2>
          <p>Okuyucu satın aldığınızda firmanıza tanımlanır; personel kartını okuttuğunda giriş, çıkış ve mola bu panele kendiliğinden düşer. O zamana kadar hareketleri elle ekleyebilirsiniz.</p>
          <div className={ui.toolbarActions} style={{ marginTop: 12 }}>
            {deviceOffer ? (
              <a href={deviceOffer.url} target="_blank" rel="noopener noreferrer" className={ui.primaryAction} aria-label={`${deviceOffer.title} satın al (Shopier, yeni sekmede açılır)`}><ShoppingCart size={16} />Okuyucu satın al<ExternalLink size={14} aria-hidden="true" /></a>
            ) : (
              <Link href="/iletisim" className={ui.primaryAction}><ShoppingCart size={16} />Okuyucu için iletişime geçin</Link>
            )}
          </div>
        </section>
      ) : null}

      <section className={ui.surface} aria-label="RFID cihaz filtreleri">
        <form className={`${ui.filterBar} ${ui.searchFilterBar}`}>
          <label className={ui.field}><span className={ui.fieldLabel}>Cihaz ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Cihaz adı, MAC adresi veya secret key" /></span></label>
          <button className={ui.filterButton} type="submit"><Filter size={15} />Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Atanmış cihazlar</h2><p>Firma ve şube bağlantılarıyla birlikte kayıtlı okuyucular</p></div><span className={ui.countBadge}>{devices.length} cihaz</span></div>
        <DevicesTable
          canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)}
          rows={devices.map((device) => ({
            id: device.id,
            name: device.name,
            code: device.code || "Cihaz kodu yok",
            company: device.company?.name ?? "Firma atanmamış",
            branch: device.branchLocation ?? "Şube atanmamış",
            macAddress: device.macAddress ?? "—",
            secretKey: can(authorization, PERMISSIONS.DEVICE_SECRET_VIEW) ? device.secretKey : "••••••••",
            lastSeen: device.lastSeenAt ? formatDate(device.lastSeenAt) : "Henüz bağlantı yok",
            actionLabel: "İncele",
            actionHref: buildDeviceUrl(query, device.id),
          }))}
        />
      </section>

      {selectedDevice ? (
        <section className={ui.surface}>
          <div className={ui.sectionHeading}><div><h2>Cihaz bilgileri</h2><p>{selectedDevice.name} kaydının kullanım yeri ve görünen adı</p></div><MonitorSmartphone size={20} /></div>
          <form action={updateDeviceAction} className={ui.formGrid}>
            <input type="hidden" name="deviceId" value={selectedDevice.id} />

            <label className={ui.formField}>
              <span>Cihaz adı</span>
              <input name="name" defaultValue={selectedDevice.name} required />
            </label>

            <label className={ui.formField}>
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

            <label className={ui.formField}>
              <span>Şube / Lokasyon</span>
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

            <label className={ui.formField}>
              <span>MAC adresi</span>
              <input value={selectedDevice.macAddress ?? ""} readOnly />
            </label>

            <label className={ui.formField}>
              <span>Secret Key</span>
              <input value={can(authorization, PERMISSIONS.DEVICE_SECRET_VIEW) ? selectedDevice.secretKey : "Gizli alan için yetkiniz yok"} readOnly />
            </label>

            <label className={ui.formField}>
              <span>Son görülme</span>
              <input value={selectedDevice.lastSeenAt ? formatDate(selectedDevice.lastSeenAt) : "Henüz yok"} readOnly />
            </label>

            <div className={`${ui.formActions} ${ui.formFullWidth}`}>
              <SubmitButton
                idleLabel="Cihazı Güncelle"
                pendingLabel="Güncelleniyor..."
                className={ui.primaryAction}
              />
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
