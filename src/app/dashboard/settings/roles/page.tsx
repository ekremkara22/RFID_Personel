import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import {
  createRoleDefinitionAction,
  updateRoleDefinitionAction,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Firma Admin",
  EMPLOYEE: "Personel",
};

const roleDescriptions: Record<Role, string> = {
  SUPERADMIN: "Tum sistemi, kullanicilari ve cihaz atamalarini yonetir.",
  COMPANY_ADMIN: "Kendi firmalarini, subelerini, personellerini ve raporlarini yonetir.",
  EMPLOYEE: "Personel roludur; panel yetkisi sinirlidir.",
};

export default async function RoleDefinitionsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const roles = await prisma.roleDefinition.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const definedCodes = new Set(roles.map((role) => role.code));
  const missingRoles = Object.values(Role).filter((role) => !definedCodes.has(role));
  const firstMissingRole = missingRoles[0] ?? Role.COMPANY_ADMIN;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Sabit Tanimlar</p>
          <h1 className={styles.title}>Rol Tanimlari</h1>
          <p className={styles.subtitle}>
            Kullanici kaydinda secilecek rol adlarini ve aktiflik durumlarini buradan yonetebilirsin.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Kayitli Roller</p>
                <h2 className={styles.sectionTitle}>Rol Listesi</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {roles.length === 0 ? (
                <p className={styles.emptyState}>Henuz rol tanimi yok. Sag taraftan sistem rollerini ekleyebilirsin.</p>
              ) : (
                roles.map((role) => (
                  <form key={role.id} action={updateRoleDefinitionAction} className={styles.definitionItem}>
                    <input type="hidden" name="roleDefinitionId" value={role.id} />
                    <label className={styles.field}>
                      <span>Rol Kodu</span>
                      <input value={role.code} readOnly />
                    </label>
                    <label className={styles.field}>
                      <span>Rol Adi</span>
                      <input name="name" defaultValue={role.name} required />
                    </label>
                    <label className={`${styles.field} ${styles.fullWidth}`}>
                      <span>Aciklama</span>
                      <input name="description" defaultValue={role.description ?? ""} />
                    </label>
                    <label className={styles.checkField}>
                      <input name="isActive" type="checkbox" defaultChecked={role.isActive} />
                      <span>Aktif</span>
                    </label>
                    <SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.smallButton} />
                  </form>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Tanim</p>
                <h2 className={styles.sectionTitle}>Rol Ekle</h2>
              </div>
            </div>

            {missingRoles.length === 0 ? (
              <p className={styles.emptyState}>Tum sistem rolleri tanimli.</p>
            ) : (
              <form action={createRoleDefinitionAction} className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Rol</span>
                  <select name="code" defaultValue={firstMissingRole}>
                    {missingRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Rol Adi</span>
                  <input name="name" placeholder={roleLabels[firstMissingRole]} />
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Aciklama</span>
                  <input name="description" placeholder={roleDescriptions[firstMissingRole]} />
                </label>
                <div className={styles.fullWidthActionRow}>
                  <SubmitButton idleLabel="Rol Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
                </div>
              </form>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
