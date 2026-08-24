import { redirect } from "next/navigation";
import { createCompanyAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function NewCompanyPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const categories = await prisma.companyCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Firma</p>
          <h1 className={styles.title}>Yeni Musteri Tanimi</h1>
          <p className={styles.subtitle}>
            Firma kaydini ve o firmaya ait ilk admin kullanicisini bu ekrandan olusturabilirsin.
          </p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Firma Bilgileri</p>
            <h2 className={styles.sectionTitle}>Kayit Formu</h2>
          </div>
        </div>

        <form action={createCompanyAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Firma Adi</span>
            <input name="companyName" required placeholder="Ornek Teknoloji A.S." />
          </label>

          <label className={styles.field}>
            <span>Yetkili Kisi</span>
            <input name="contactName" placeholder="Ali Veli" />
          </label>

          <label className={styles.field}>
            <span>Firma E-postasi</span>
            <input name="contactEmail" type="email" placeholder="info@firma.com" />
          </label>

          <label className={styles.field}>
            <span>Telefon</span>
            <input name="contactPhone" placeholder="0555 111 22 33" />
          </label>

          <label className={styles.field}>
            <span>Il</span>
            <select name="city" defaultValue="">
              <option value="">Seciniz</option>
              <option value="Istanbul">Istanbul</option>
              <option value="Ankara">Ankara</option>
              <option value="Izmir">Izmir</option>
              <option value="Bursa">Bursa</option>
              <option value="Antalya">Antalya</option>
              <option value="Kocaeli">Kocaeli</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Ilce</span>
            <select name="district" defaultValue="">
              <option value="">Seciniz</option>
              <option value="Merkez">Merkez</option>
              <option value="Kadikoy">Kadikoy</option>
              <option value="Besiktas">Besiktas</option>
              <option value="Sariyer">Sariyer</option>
              <option value="Cankaya">Cankaya</option>
              <option value="Nilufer">Nilufer</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Firma Kategori</span>
            <select name="category" defaultValue="">
              <option value="">Seciniz</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Adres</span>
            <textarea name="address" rows={4} placeholder="Firma adres bilgisi" />
          </label>

          <label className={styles.field}>
            <span>Admin Adi</span>
            <input name="adminFirstName" required placeholder="Mehmet" />
          </label>

          <label className={styles.field}>
            <span>Admin Soyadi</span>
            <input name="adminLastName" required placeholder="Yildiz" />
          </label>

          <label className={styles.field}>
            <span>Admin E-postasi</span>
            <input name="adminEmail" type="email" required placeholder="yonetici@firma.com" />
          </label>

          <label className={styles.field}>
            <span>Admin Sifresi</span>
            <input name="adminPassword" type="password" required placeholder="Guclu bir sifre" />
          </label>

          <div className={styles.fullWidth}>
            <SubmitButton
              idleLabel="Firmayi Kaydet"
              pendingLabel="Kaydediliyor..."
              className={styles.primaryButton}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
