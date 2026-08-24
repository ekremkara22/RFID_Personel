import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteEmployeeAction, updateEmployeeAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function EmployeeDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const [employee, departments] = await Promise.all([
    prisma.employee.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    }),
    prisma.department.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!employee) {
    notFound();
  }

  const departmentOptions = departments.some((department) => department.name === employee.department)
    ? departments
    : [{ id: "current", name: employee.department, isActive: true, companyId: user.companyId, createdAt: new Date(), updatedAt: new Date() }, ...departments];

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personel Detay</p>
          <h1 className={styles.title}>
            {employee.firstName} {employee.lastName}
          </h1>
          <p className={styles.subtitle}>
            Personel bilgilerini, departmanini, aktiflik durumunu ve RFID kart ID bilgisini bu ekrandan yonet.
          </p>
        </div>
        <Link href="/dashboard/employees" className={styles.inlineAction}>
          Listeye Don
        </Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateEmployeeAction} className={styles.formGrid}>
          <input type="hidden" name="employeeId" value={employee.id} />

          <label className={styles.field}>
            <span>Isim</span>
            <input name="firstName" defaultValue={employee.firstName} required />
          </label>

          <label className={styles.field}>
            <span>Soyisim</span>
            <input name="lastName" defaultValue={employee.lastName} required />
          </label>

          <label className={styles.field}>
            <span>E-posta</span>
            <input name="email" type="email" defaultValue={employee.email ?? ""} />
          </label>

          <label className={styles.field}>
            <span>Yeni Sifre</span>
            <input name="password" type="password" placeholder="Degistirmek istemiyorsan bos birak" />
          </label>

          <label className={styles.field}>
            <span>Departman</span>
            <select name="department" defaultValue={employee.department} required>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Yas</span>
            <input name="age" type="number" defaultValue={employee.age} min="16" max="90" required />
          </label>

          <label className={styles.field}>
            <span>RFID Kart ID</span>
            <input
              name="rfidCardId"
              defaultValue={employee.rfidCardId ?? ""}
              placeholder="Kart okutuldugunda gelen UID"
            />
          </label>

          <label className={`${styles.checkField} ${styles.formActionAlign}`}>
            <input name="isActive" type="checkbox" defaultChecked={employee.isActive} />
            <span>Personel aktif</span>
          </label>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton
              idleLabel="Personeli Guncelle"
              pendingLabel="Guncelleniyor..."
              className={styles.primaryButton}
            />
          </div>
        </form>

        <form action={deleteEmployeeAction} className={styles.dangerForm}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <SubmitButton
            idleLabel="Personeli Sil"
            pendingLabel="Siliniyor..."
            className={styles.dangerButton}
          />
        </form>
      </section>
    </div>
  );
}
