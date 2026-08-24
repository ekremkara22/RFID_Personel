import { redirect } from "next/navigation";
import { createManagerAction, updateManagerAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function ManagersPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const managers = await prisma.manager.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Yoneticiler</h1>
          <p className={styles.subtitle}>
            Personel kayitlarinda secilecek bagli yoneticileri ve mail adreslerini burada tanimla.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Tanim</p>
                <h2 className={styles.sectionTitle}>Yonetici Ekle</h2>
              </div>
            </div>

            <form action={createManagerAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Yonetici Ad Soyad</span>
                <input name="name" required placeholder="Ayse Yilmaz" />
              </label>
              <label className={styles.field}>
                <span>Mail Adresi</span>
                <input name="email" type="email" placeholder="yonetici@firma.com" />
              </label>
              <div className={styles.fullWidth}>
                <SubmitButton
                  idleLabel="Yonetici Kaydet"
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
                <h2 className={styles.sectionTitle}>Firma Yoneticileri</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {managers.length === 0 ? (
                <p className={styles.emptyState}>Henuz yonetici tanimlanmadi.</p>
              ) : (
                managers.map((manager) => (
                  <form key={manager.id} action={updateManagerAction} className={styles.definitionItem}>
                    <input type="hidden" name="managerId" value={manager.id} />
                    <label className={styles.field}>
                      <span>Yonetici</span>
                      <input name="name" defaultValue={manager.name} required />
                    </label>
                    <label className={styles.field}>
                      <span>Mail</span>
                      <input name="email" type="email" defaultValue={manager.email ?? ""} />
                    </label>
                    <label className={styles.checkField}>
                      <input name="isActive" type="checkbox" defaultChecked={manager.isActive} />
                      <span>Aktif</span>
                    </label>
                    <SubmitButton idleLabel="Guncelle" pendingLabel="..." className={styles.smallButton} />
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
