import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DevicePurpose } from "@/generated/prisma/client";
import { updateCompanyDeviceAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../../page.module.css";

const purposeLabels = {
  ENTRY: "Giris okuyucusu",
  EXIT: "Cikis okuyucusu",
  BREAK_START: "Mola baslangic okuyucusu",
  BREAK_END: "Mola bitis okuyucusu",
  BIDIRECTIONAL: "Cift yonlu okuyucu",
} as const;

export default async function CompanyDeviceDetailPage(props: {
  params: Promise<{ id: string; deviceId: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const { id, deviceId } = await props.params;
  const [company, device] = await Promise.all([
    prisma.company.findUnique({ where: { id } }),
    prisma.device.findFirst({ where: { id: deviceId, companyId: id } }),
  ]);

  if (!company || !device) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Cihaz Detay</p>
          <h1 className={styles.title}>{device.name}</h1>
          <p className={styles.subtitle}>
            {company.name} firmasina atanmis okuyucunun teknik bilgilerini ve kullanim amacini duzenle.
          </p>
        </div>
        <Link href={`/dashboard/companies/${company.id}?tab=devices`} className={styles.inlineAction}>
          Cihaz Listesine Don
        </Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateCompanyDeviceAction} className={styles.formGrid}>
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="deviceId" value={device.id} />
          <label className={styles.field}>
            <span>Cihaz Kodu</span>
            <input name="code" defaultValue={device.code ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Cihaz Adi</span>
            <input name="name" defaultValue={device.name} required />
          </label>
          <label className={styles.field}>
            <span>MAC Adresi</span>
            <input name="macAddress" defaultValue={device.macAddress ?? ""} required />
          </label>
          <label className={styles.field}>
            <span>IP Adresi</span>
            <input name="ipAddress" defaultValue={device.ipAddress ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Sube/Lokasyon</span>
            <input name="branchLocation" defaultValue={device.branchLocation ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Kullanim Amaci</span>
            <select name="purpose" defaultValue={device.purpose}>
              {Object.values(DevicePurpose).map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purposeLabels[purpose]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Cihaz Saat Farki (dk)</span>
            <input name="clockOffsetMinutes" type="number" defaultValue={device.clockOffsetMinutes ?? 0} />
          </label>

          <div className={styles.detailList}>
            <p>
              <span>Secret Key</span>
              {device.secretKey}
            </p>
            <p>
              <span>Son Baglanti</span>
              {device.lastSeenAt ? device.lastSeenAt.toLocaleString("tr-TR") : "Henuz yok"}
            </p>
            <p>
              <span>Son Veri Aktarimi</span>
              {device.lastDataTransferAt ? device.lastDataTransferAt.toLocaleString("tr-TR") : "Henuz yok"}
            </p>
          </div>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton
              idleLabel="Cihazi Guncelle"
              pendingLabel="Guncelleniyor..."
              className={styles.primaryButton}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
