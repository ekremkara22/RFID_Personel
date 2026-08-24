import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Pencil, Search } from "lucide-react";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

function buildEmployeeUrl(employeeQ: string, employeeId?: string) {
  const params = new URLSearchParams();

  if (employeeQ) {
    params.set("q", employeeQ);
  }

  if (employeeId) {
    params.set("employeeId", employeeId);
  }

  return `/dashboard/employees${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function EmployeesPage(props: {
  searchParams: Promise<{ q?: string; employeeId?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const selectedEmployeeId =
    typeof searchParams.employeeId === "string" ? searchParams.employeeId : "";

  const employees = await prisma.employee.findMany({
    where: {
      companyId: user.companyId,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { department: { contains: query } },
              { rfidCardId: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personeller</p>
          <h1 className={styles.title}>Personel Yonetimi</h1>
          <p className={styles.subtitle}>
            Personelleri tam sayfa tabloda arayabilir, secili kaydin bilgilerini inceleyebilir,
            duzenleyebilir veya silebilirsin.
          </p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <Search size={18} />
            <input
              name="q"
              defaultValue={query}
              placeholder="Personel arama: ad, soyad, departman, e-posta veya RFID kart"
            />
            <button type="submit">Ara</button>
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Departman</th>
                <th>RFID Kart ID</th>
                <th>E-posta</th>
                <th>Statu</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    Aramana uygun personel bulunamadi.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>
                        {employee.firstName} {employee.lastName}
                      </strong>
                      <p className={styles.tableSubText}>{employee.age} yas</p>
                    </td>
                    <td>{employee.department}</td>
                    <td className={styles.monoCell}>{employee.rfidCardId ?? "Kart atanmadi"}</td>
                    <td>{employee.email ?? "-"}</td>
                    <td>
                      <span className={employee.isActive ? styles.statusActive : styles.statusPassive}>
                        {employee.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={buildEmployeeUrl(query, employee.id)}
                        className={styles.inlineAction}
                      >
                        <Eye size={16} />
                        <span>Incele</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedEmployee ? (
        <section className={`glass-panel ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Secili Personel</p>
              <h2 className={styles.sectionTitle}>
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h2>
            </div>
          </div>

          <form action={updateEmployeeAction} className={styles.formGrid}>
            <input type="hidden" name="employeeId" value={selectedEmployee.id} />

            <label className={styles.field}>
              <span>Isim</span>
              <input name="firstName" defaultValue={selectedEmployee.firstName} required />
            </label>

            <label className={styles.field}>
              <span>Soyisim</span>
              <input name="lastName" defaultValue={selectedEmployee.lastName} required />
            </label>

            <label className={styles.field}>
              <span>E-posta</span>
              <input name="email" type="email" defaultValue={selectedEmployee.email ?? ""} />
            </label>

            <label className={styles.field}>
              <span>Yeni Sifre</span>
              <input name="password" type="password" placeholder="Degistirmek istemiyorsan bos birak" />
            </label>

            <label className={styles.field}>
              <span>Departman</span>
              <input name="department" defaultValue={selectedEmployee.department} required />
            </label>

            <label className={styles.field}>
              <span>Yas</span>
              <input name="age" type="number" defaultValue={selectedEmployee.age} min="16" max="90" required />
            </label>

            <label className={styles.field}>
              <span>RFID Kart ID</span>
              <input
                name="rfidCardId"
                defaultValue={selectedEmployee.rfidCardId ?? ""}
                placeholder="Kart okutuldugunda gelen UID"
              />
            </label>

            <label className={`${styles.checkField} ${styles.formActionAlign}`}>
              <input name="isActive" type="checkbox" defaultChecked={selectedEmployee.isActive} />
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
            <input type="hidden" name="employeeId" value={selectedEmployee.id} />
            <SubmitButton
              idleLabel="Personeli Sil"
              pendingLabel="Siliniyor..."
              className={styles.dangerButton}
            />
          </form>
        </section>
      ) : null}

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Yeni Kayit</p>
            <h2 className={styles.sectionTitle}>Personel Ekle</h2>
          </div>
          <Pencil size={18} />
        </div>

        <form action={createEmployeeAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Isim</span>
            <input name="firstName" required placeholder="Ahmet" />
          </label>

          <label className={styles.field}>
            <span>Soyisim</span>
            <input name="lastName" required placeholder="Yilmaz" />
          </label>

          <label className={styles.field}>
            <span>E-posta</span>
            <input name="email" type="email" placeholder="ahmet@firma.com" />
          </label>

          <label className={styles.field}>
            <span>Sifre</span>
            <input name="password" type="password" placeholder="Opsiyonel personel sifresi" />
          </label>

          <label className={styles.field}>
            <span>Departman</span>
            <input name="department" required placeholder="Uretim" />
          </label>

          <label className={styles.field}>
            <span>Yas</span>
            <input name="age" type="number" min="16" max="90" required />
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>RFID Kart ID</span>
            <input name="rfidCardId" placeholder="Kart okutuldugunda gelen UID" />
          </label>

          <div className={styles.fullWidth}>
            <SubmitButton
              idleLabel="Personeli Kaydet"
              pendingLabel="Kaydediliyor..."
              className={styles.primaryButton}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
