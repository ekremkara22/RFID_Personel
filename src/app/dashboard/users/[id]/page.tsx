import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { deleteDashboardUserAction, updateDashboardUserAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function UserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const [record, companies, devices] = await Promise.all([
    prisma.user.findFirst({
      where: { id },
      include: {
        companyAccess: true,
        deviceAccess: true,
      },
    }),
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.device.findMany({ include: { company: true }, orderBy: [{ company: { name: "asc" } }, { name: "asc" }] }),
  ]);

  if (!record) notFound();

  const selectedCompanyIds = new Set(record.companyAccess.map((access) => access.companyId));
  if (record.companyId) selectedCompanyIds.add(record.companyId);
  const selectedDeviceIds = new Set(record.deviceAccess.map((access) => access.deviceId));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Kullanici Detay</p>
          <h1 className={styles.title}>{record.name ?? record.email}</h1>
          <p className={styles.subtitle}>Firma ve RFID cihaz yetkilerini bu ekrandan duzenle.</p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateDashboardUserAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/users" />
          <input type="hidden" name="userId" value={record.id} />
          <label className={styles.field}><span>Ad</span><input name="firstName" defaultValue={record.firstName ?? ""} required /></label>
          <label className={styles.field}><span>Soyad</span><input name="lastName" defaultValue={record.lastName ?? ""} required /></label>
          <label className={styles.field}><span>E-posta</span><input name="email" type="email" defaultValue={record.email} required /></label>
          <label className={styles.field}><span>Yeni Sifre</span><input name="password" type="password" placeholder="Degistirmek istemiyorsan bos birak" /></label>
          <label className={styles.field}>
            <span>Rol</span>
            <select name="role" defaultValue={record.role}>
              <option value={Role.COMPANY_ADMIN}>Firma Admin</option>
              <option value={Role.SUPERADMIN}>Super Admin</option>
            </select>
          </label>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <span>Yetkili Oldugu Firmalar</span>
            <div className={styles.checkListGrid}>
              {companies.map((company) => (
                <label key={company.id} className={styles.checkField}>
                  <input name="companyIds" type="checkbox" value={company.id} defaultChecked={selectedCompanyIds.has(company.id)} />
                  <span>{company.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <span>Yetkili Oldugu Cihazlar</span>
            <div className={styles.checkListGrid}>
              {devices.map((device) => (
                <label key={device.id} className={styles.checkField}>
                  <input name="deviceIds" type="checkbox" value={device.id} defaultChecked={selectedDeviceIds.has(device.id)} />
                  <span>{device.company.name} / {device.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Kullaniciyi Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
          </div>
        </form>

        <form action={deleteDashboardUserAction} className={styles.dangerForm}>
          <input type="hidden" name="userId" value={record.id} />
          <SubmitButton idleLabel="Kullaniciyi Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
        </form>
      </section>
    </div>
  );
}
