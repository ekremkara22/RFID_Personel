import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createDashboardUserAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Firma Admin",
  EMPLOYEE: "Personel",
};

export default async function NewUserPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const roleDefinitions = await prisma.roleDefinition.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const roles = roleDefinitions.length > 0
    ? roleDefinitions.map((role) => ({ code: role.code, name: role.name }))
    : Object.values(Role).map((role) => ({ code: role, name: roleLabels[role] }));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Yeni Kullanici</p>
          <h1 className={styles.title}>Kullanici Tanimla</h1>
          <p className={styles.subtitle}>Kullanici bilgilerini gir ve panelde kullanacagi rol tipini sec.</p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createDashboardUserAction} className={styles.formGrid}>
          <label className={styles.field}><span>Ad</span><input name="firstName" required /></label>
          <label className={styles.field}><span>Soyad</span><input name="lastName" required /></label>
          <label className={styles.field}><span>E-posta</span><input name="email" type="email" required /></label>
          <label className={styles.field}><span>Sifre</span><input name="password" type="password" required /></label>
          <label className={styles.field}>
            <span>Rol</span>
            <select name="role" defaultValue={Role.COMPANY_ADMIN}>
              {roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Kullaniciyi Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
