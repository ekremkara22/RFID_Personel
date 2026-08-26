import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { DevicePurpose } from "@/generated/prisma/client";
import { createCompanyDeviceAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { parseRouteId } from "@/lib/ids";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../../page.module.css";

const purposeLabels = {
  ENTRY: "Giris okuyucusu",
  EXIT: "Cikis okuyucusu",
  BREAK_START: "Mola baslangic okuyucusu",
  BREAK_END: "Mola bitis okuyucusu",
  BIDIRECTIONAL: "Cift yonlu okuyucu",
} as const;

export default async function NewCompanyDevicePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const id = parseRouteId((await props.params).id);
  const company = await prisma.company.findUnique({ where: { id } });

  if (!company) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Cihaz</p>
          <h1 className={styles.title}>{company.name} Cihaz Ekle</h1>
          <p className={styles.subtitle}>
            Firma icin RFID okuyucu cihaz kodu, MAC, IP ve kullanim amacini tanimla.
          </p>
        </div>
        <BackLink href={`/dashboard/companies/${company.id}?tab=devices`} />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCompanyDeviceAction} className={styles.formGrid}>
          <input type="hidden" name="companyId" value={company.id} />
          <label className={styles.field}>
            <span>Cihaz Kodu</span>
            <input name="code" placeholder="TERM-GIRIS-01" />
          </label>
          <label className={styles.field}>
            <span>Cihaz Adi</span>
            <input name="name" required placeholder="On Kapi RFID Okuyucu" />
          </label>
          <label className={styles.field}>
            <span>MAC Adresi</span>
            <input name="macAddress" required placeholder="AA-BB-CC-DD-EE-FF" />
          </label>
          <label className={styles.field}>
            <span>IP Adresi</span>
            <input name="ipAddress" placeholder="192.168.1.20" />
          </label>
          <label className={styles.field}>
            <span>Sube/Lokasyon</span>
            <input name="branchLocation" placeholder="Firma admini sonra lokasyon guncelleyebilir" />
          </label>
          <label className={styles.field}>
            <span>Kullanim Amaci</span>
            <select name="purpose" defaultValue={DevicePurpose.BIDIRECTIONAL}>
              {Object.values(DevicePurpose).map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purposeLabels[purpose]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Cihaz Saat Farki (dk)</span>
            <input name="clockOffsetMinutes" type="number" defaultValue={0} />
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Cihazi Ekle" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
