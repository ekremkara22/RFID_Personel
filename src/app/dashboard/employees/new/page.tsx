import Link from "next/link";
import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createEmployeeAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { getAccessibleCompanyIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function NewEmployeePage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const companyIds = await getAccessibleCompanyIds(user);
  const scopedCompanyIds = companyIds ?? [user.companyId];

  const [companies, departments, branches, managers] = await Promise.all([
    prisma.company.findMany({
      where: { id: { in: scopedCompanyIds }, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: {
        companyId: { in: scopedCompanyIds },
        isActive: true,
      },
      include: { company: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: {
        companyId: { in: scopedCompanyIds },
        isActive: true,
      },
      include: { company: true },
      orderBy: { name: "asc" },
    }),
    prisma.manager.findMany({
      where: {
        companyId: { in: scopedCompanyIds },
        isActive: true,
      },
      include: { company: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Kayit</p>
          <h1 className={styles.title}>Personel Ekle</h1>
          <p className={styles.subtitle}>
            RFID kart ID bilgisini personel kaydi sirasinda tanimlayarak kart okutma akisini hazir hale getir.
          </p>
        </div>
        <BackLink href="/dashboard/employees" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        {departments.length === 0 ? (
          <div className={styles.emptyPanel}>
            <h2 className={styles.sectionTitle}>Once departman tanimla</h2>
            <p className={styles.emptyState}>
              Personel kaydi icin en az bir aktif departman gerekiyor.
            </p>
            <Link href="/dashboard/settings/departments" className={styles.primaryLinkButton}>
              Departman Ekle
            </Link>
          </div>
        ) : (
          <form action={createEmployeeAction} className={styles.formGrid} encType="multipart/form-data">
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>Personel Resmi</span>
              <input name="photo" type="file" accept="image/*" />
            </label>

            <label className={styles.field}>
              <span>Ad</span>
              <input name="firstName" required placeholder="Ahmet" />
            </label>

            <label className={styles.field}>
              <span>Soyad</span>
              <input name="lastName" required placeholder="Yilmaz" />
            </label>

            <label className={styles.field}>
              <span>Sicil Numarasi</span>
              <input name="registrationNumber" placeholder="PDKS sicil no" />
            </label>

            <label className={styles.field}>
              <span>RFID Kart Numarasi</span>
              <input name="rfidCardId" placeholder="Kart okutuldugunda gelen UID" />
            </label>

            <label className={styles.field}>
              <span>E-posta</span>
              <input name="email" type="email" placeholder="ahmet@firma.com" />
            </label>

            <label className={styles.field}>
              <span>Sifre</span>
              <input name="password" type="password" placeholder="Opsiyonel personel sifresi" />
            </label>

            <label className={styles.field}>
              <span>Firma</span>
              <select name="companyId" required defaultValue={user.companyId}>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Departman</span>
              <select name="department" required defaultValue="">
                <option value="" disabled>
                  Departman sec
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.company.name} / {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Sube</span>
              <select name="branch" defaultValue="">
                <option value="">Merkez / belirtilmedi</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.company.name} / {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Ise Giris Tarihi</span>
              <input name="hireDate" type="date" />
            </label>

            <label className={styles.field}>
              <span>Ayrilis Tarihi</span>
              <input name="terminationDate" type="date" />
            </label>

            <label className={styles.field}>
              <span>Bagli Yonetici</span>
              <select name="managerName" defaultValue="">
                <option value="">Yonetici secilmedi</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.name}>
                    {manager.company.name} / {manager.name} {manager.email ? `- ${manager.email}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Yas</span>
              <input name="age" type="number" min="16" max="90" defaultValue={18} required />
            </label>

            <div className={styles.fullWidthActionRow}>
              <SubmitButton
                idleLabel="Personeli Kaydet"
                pendingLabel="Kaydediliyor..."
                className={styles.primaryButton}
              />
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
