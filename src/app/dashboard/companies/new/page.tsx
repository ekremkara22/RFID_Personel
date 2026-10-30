import { redirect } from "next/navigation";
import { ATTENDANCE_TRACKING_MODE_LABELS, ATTENDANCE_TRACKING_MODE_OPTIONS, BREAK_DEDUCTION_MODE_LABELS, BREAK_DEDUCTION_MODE_OPTIONS } from "@/lib/attendance-labels";
import { BackLink } from "@/app/dashboard/back-link";
import { createCompanyAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { isReleasedModule } from "@/modules/registry";
import styles from "../../page.module.css";

export default async function NewCompanyPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const [categories, fullCatalog] = await Promise.all([
    queryRepository.companyCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getModuleCatalog(),
  ]);
  const moduleCatalog = user.role === "SUPERADMIN" ? fullCatalog : fullCatalog.filter((module) => isReleasedModule(module.key));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Firma</p>
          <h1 className={styles.title}>Yeni Musteri Tanimi</h1>
          <p className={styles.subtitle}>
            {user.role === "SUPERADMIN"
              ? "Firma kaydini ve o firmaya ait ilk admin kullanicisini bu ekrandan olusturabilirsin."
              : "Kendi yonetecegin firma kaydini bu ekrandan olusturabilirsin."}
          </p>
        </div>
        <BackLink href={user.role === "SUPERADMIN" ? "/dashboard/companies" : "/dashboard/store"} />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Firma Bilgileri</p>
            <h2 className={styles.sectionTitle}>Kayit Formu</h2>
          </div>
        </div>

        <form action={createCompanyAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value={user.role === "SUPERADMIN" ? "/dashboard/companies" : "/dashboard"} />
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

          <label className={styles.field}>
            <span>Mesai Sonu Kesinleştirme Toleransı</span>
            <input name="attendanceFinalizationDelayMinutes" type="number" min={30} max={720} step={30} defaultValue={120} required />
            <small>Hareketler vardiya bitiminden bu kadar dakika sonra kesinleştirilir.</small>
          </label>

          <label className={styles.field}>
            <span>Mola Takibi</span>
            <select name="attendanceTrackingMode" defaultValue="BREAK_TRACKING">
              {ATTENDANCE_TRACKING_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>{ATTENDANCE_TRACKING_MODE_LABELS[mode]}</option>
              ))}
            </select>
            <small>Kapalıyken ilk okutma giriş, son okutma çıkış sayılır; aradaki okutmalar mola sayılmaz. Değişiklik açık puantaj dönemlerine uygulanır, onaylı ve kilitli dönemler değişmez.</small>
          </label>

          <label className={styles.field}>
            <span>Mola Düşümü</span>
            <select name="breakDeductionMode" defaultValue="PLANNED_AND_EXCESS">
              {BREAK_DEDUCTION_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>{BREAK_DEDUCTION_MODE_LABELS[mode]}</option>
              ))}
            </select>
            <small>Mola takibi kapalıyken yalnız planlanan mola düşülür. Açıkken ölçülen mola raporlanır; planlanan molayı aşan sürenin puantajdan düşülüp düşülmeyeceğini buradan seçin.</small>
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Adres</span>
            <textarea name="address" rows={4} placeholder="Firma adres bilgisi" />
          </label>

          {user.role === "SUPERADMIN" ? (
            <>
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
                <input name="adminEmail" autoComplete="off" type="email" required placeholder="yonetici@firma.com" />
              </label>

              <label className={styles.field}>
                <span>Admin Kullanıcı Adı</span>
                <input name="adminUsername" autoComplete="off" required minLength={3} pattern="[a-zA-Z0-9._-]+" placeholder="firma.admin" />
              </label>

              <label className={styles.field}>
                <span>Admin Telefonu</span>
                <input name="adminPhone" type="tel" placeholder="0555 111 22 33" />
              </label>

              <label className={styles.field}>
                <span>Admin Sifresi</span>
                <input name="adminPassword" type="password" autoComplete="new-password" minLength={10} required placeholder="En az 10 karakter" />
              </label>

              <fieldset className={`${styles.scopeFieldset} ${styles.fullWidth}`}>
                <legend>Firma Admini Modül Yetkileri</legend>
                <div className={styles.permissionCheckGrid}>{moduleCatalog.map((module) => <label key={module.key} className={styles.checkField}><input type="checkbox" name="moduleKeys" value={module.key} defaultChecked/><span className={styles.moduleCheckCopy}><strong>{module.name}</strong><small>{module.description}</small></span></label>)}</div>
              </fieldset>
            </>
          ) : null}

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
