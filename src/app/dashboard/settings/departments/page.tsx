import { redirect } from "next/navigation";
import { createDepartmentAction, updateDepartmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function DepartmentsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Departmanlar</h1>
          <p className={styles.subtitle}>
            Personel kayitlarinda secilecek departmanlari tanimla. PDKS ve puantaj raporlari bu tanimlara gore gruplanir.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Tanim</p>
                <h2 className={styles.sectionTitle}>Departman Ekle</h2>
              </div>
            </div>

            <form action={createDepartmentAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Departman Adi</span>
                <input name="name" required placeholder="Uretim, Depo, Muhasebe..." />
              </label>

              <div className={styles.formActionAlign}>
                <SubmitButton
                  idleLabel="Departman Kaydet"
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
                <h2 className={styles.sectionTitle}>Firma Departmanlari</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {departments.length === 0 ? (
                <p className={styles.emptyState}>Henuz departman tanimlanmadi.</p>
              ) : (
                departments.map((department) => (
                  <form
                    key={department.id}
                    action={updateDepartmentAction}
                    className={styles.definitionItem}
                  >
                    <input type="hidden" name="departmentId" value={department.id} />
                    <label className={styles.field}>
                      <span>Departman</span>
                      <input name="name" defaultValue={department.name} required />
                    </label>
                    <label className={styles.checkField}>
                      <input name="isActive" type="checkbox" defaultChecked={department.isActive} />
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
