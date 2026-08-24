import { redirect } from "next/navigation";
import {
  createCompanyCategoryAction,
  updateCompanyCategoryAction,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function CompanyCategoriesPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const categories = await prisma.companyCategory.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Firma Kategori</h1>
          <p className={styles.subtitle}>
            Firma kayitlarinda kullanilacak kategori degerlerini buradan tanimlayabilir ve aktif/pasif yapabilirsin.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Tanim</p>
                <h2 className={styles.sectionTitle}>Kategori Ekle</h2>
              </div>
            </div>

            <form action={createCompanyCategoryAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Kategori Adi</span>
                <input name="name" required placeholder="Uretim, Lojistik, Hizmet..." />
              </label>

              <div className={styles.formActionAlign}>
                <SubmitButton
                  idleLabel="Kategori Kaydet"
                  pendingLabel="Kaydediliyor..."
                  className={styles.primaryButton}
                />
              </div>
            </form>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Kayitli Tanimlar</p>
                <h2 className={styles.sectionTitle}>Firma Kategorileri</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {categories.length === 0 ? (
                <p className={styles.emptyState}>Henuz firma kategorisi tanimlanmadi.</p>
              ) : (
                categories.map((category) => (
                  <form
                    key={category.id}
                    action={updateCompanyCategoryAction}
                    className={styles.definitionItem}
                  >
                    <input type="hidden" name="categoryId" value={category.id} />
                    <label className={styles.field}>
                      <span>Kategori</span>
                      <input name="name" defaultValue={category.name} required />
                    </label>
                    <label className={styles.checkField}>
                      <input name="isActive" type="checkbox" defaultChecked={category.isActive} />
                      <span>Aktif</span>
                    </label>
                    <SubmitButton
                      idleLabel="Guncelle"
                      pendingLabel="Guncelleniyor..."
                      className={styles.smallButton}
                    />
                  </form>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
