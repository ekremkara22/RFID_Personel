import { redirect } from "next/navigation";
import { createBranchAction, updateBranchAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function BranchesPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const branches = await prisma.branch.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Subeler</h1>
          <p className={styles.subtitle}>
            Firma icindeki merkez, sube, depo veya lokasyonlari burada tanimla.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Tanim</p>
                <h2 className={styles.sectionTitle}>Sube Ekle</h2>
              </div>
            </div>

            <form action={createBranchAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Sube Adi</span>
                <input name="name" required placeholder="Merkez, Fabrika, Depo..." />
              </label>
              <label className={styles.field}>
                <span>Lokasyon</span>
                <input name="location" placeholder="Adres veya kisa lokasyon bilgisi" />
              </label>
              <div className={styles.fullWidth}>
                <SubmitButton
                  idleLabel="Sube Kaydet"
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
                <h2 className={styles.sectionTitle}>Firma Subeleri</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {branches.length === 0 ? (
                <p className={styles.emptyState}>Henuz sube tanimlanmadi.</p>
              ) : (
                branches.map((branch) => (
                  <form key={branch.id} action={updateBranchAction} className={styles.definitionItem}>
                    <input type="hidden" name="branchId" value={branch.id} />
                    <label className={styles.field}>
                      <span>Sube</span>
                      <input name="name" defaultValue={branch.name} required />
                    </label>
                    <label className={styles.field}>
                      <span>Lokasyon</span>
                      <input name="location" defaultValue={branch.location ?? ""} />
                    </label>
                    <label className={styles.checkField}>
                      <input name="isActive" type="checkbox" defaultChecked={branch.isActive} />
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
