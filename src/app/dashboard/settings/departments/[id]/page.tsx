import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { updateDepartmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { parseRouteId } from "@/lib/ids";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function DepartmentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const id = parseRouteId((await props.params).id);
  const department = await prisma.department.findFirst({ where: { id, companyId: user.companyId } });
  if (!department) notFound();

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Departman Detay</p>
          <h1 className={styles.title}>{department.name}</h1>
        </div>
        <BackLink href="/dashboard/settings/departments" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateDepartmentAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/departments" />
          <input type="hidden" name="departmentId" value={department.id} />
          <label className={styles.field}>
            <span>Departman Adi</span>
            <input name="name" defaultValue={department.name} required />
          </label>
          <label className={styles.checkField}>
            <input name="isActive" type="checkbox" defaultChecked={department.isActive} />
            <span>Aktif</span>
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
