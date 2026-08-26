import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createDashboardUserAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function NewUserPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const [companies, devices] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.device.findMany({ include: { company: true }, orderBy: [{ company: { name: "asc" } }, { name: "asc" }] }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Kullanici</p>
          <h1 className={styles.title}>Kullanici Tanimla</h1>
          <p className={styles.subtitle}>Kullanici bilgilerini gir, firmalari ve RFID cihaz yetkilerini ata.</p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createDashboardUserAction} className={styles.formGrid}>
          <label className={styles.field}><span>Ad</span><input name="firstName" required /></label>
          <label className={styles.field}><span>Soyad</span><input name="lastName" required /></label>
          <label className={styles.field}><span>E-posta</span><input name="email" type="email" required /></label>
          <label className={styles.field}><span>Sifre</span><input name="password" type="password" required /></label>
          <label className={styles.field}><span>Rol</span><input value="Firma Admin" readOnly /></label>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <span>Yetkili Oldugu Firmalar</span>
            <div className={styles.checkListGrid}>
              {companies.map((company) => (
                <label key={company.id} className={styles.checkField}>
                  <input name="companyIds" type="checkbox" value={company.id} />
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
                  <input name="deviceIds" type="checkbox" value={device.id} />
                  <span>{device.company.name} / {device.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Kullaniciyi Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
