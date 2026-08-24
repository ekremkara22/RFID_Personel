import Link from "next/link";
import { redirect } from "next/navigation";
import { createEmployeeAction, updateEmployeeAction } from "@/app/dashboard/actions";
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
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0] ?? null;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personeller</p>
          <h1 className={styles.title}>Personel Yonetimi</h1>
          <p className={styles.subtitle}>
            Personelleri listbox mantigiyla arayabilir, secili personelin detay bilgilerini inceleyip
            guncelleyebilirsin.
          </p>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Kayitli Liste</p>
                <h2 className={styles.sectionTitle}>Personeller</h2>
              </div>
            </div>

            <form className={styles.searchForm}>
              <input name="q" defaultValue={query} placeholder="Personel arama textboxu" />
              <button type="submit">Arama</button>
            </form>

            <div className={styles.listBox}>
              {employees.length === 0 ? (
                <p className={styles.emptyState}>Aramana uygun personel bulunamadi.</p>
              ) : (
                employees.map((employee) => (
                  <Link
                    key={employee.id}
                    href={buildEmployeeUrl(query, employee.id)}
                    className={selectedEmployee?.id === employee.id ? styles.listItemActive : styles.listItemLink}
                  >
                    <div>
                      <p className={styles.logTitle}>
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className={styles.logMeta}>
                        {employee.department} | {employee.age} yas
                      </p>
                    </div>
                    <div className={styles.logMetaRight}>
                      <p>{employee.email ?? "-"}</p>
                      <p>{employee.isActive ? "Aktif" : "Pasif"}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Yeni Kayit</p>
                <h2 className={styles.sectionTitle}>Personel Ekle</h2>
              </div>
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
                <span>Mobil Uygulama E-postasi</span>
                <input name="email" type="email" required placeholder="ahmet@firma.com" />
              </label>

              <label className={styles.field}>
                <span>Mobil Uygulama Sifresi</span>
                <input name="password" type="password" required placeholder="Personel sifresi" />
              </label>

              <label className={styles.field}>
                <span>Departman</span>
                <input name="department" required placeholder="Uretim" />
              </label>

              <label className={styles.field}>
                <span>Yas</span>
                <input name="age" type="number" min="16" max="90" required />
              </label>

              <label className={styles.field}>
                <span>Izinli Enlem</span>
                <input name="allowedLatitude" type="number" step="0.000001" required />
              </label>

              <label className={styles.field}>
                <span>Izinli Boylam</span>
                <input name="allowedLongitude" type="number" step="0.000001" required />
              </label>

              <label className={styles.field}>
                <span>Izinli Alan (metre)</span>
                <input name="allowedRadiusM" type="number" min="10" required />
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

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Personel Detayi</p>
                <h2 className={styles.sectionTitle}>Secili Personel</h2>
              </div>
            </div>

            {selectedEmployee ? (
              <form action={updateEmployeeAction} className={styles.formGridSingle}>
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
                  <input name="email" type="email" defaultValue={selectedEmployee.email ?? ""} required />
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
                  <span>Izinli Enlem</span>
                  <input
                    name="allowedLatitude"
                    type="number"
                    step="0.000001"
                    defaultValue={selectedEmployee.allowedLatitude ?? ""}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Izinli Boylam</span>
                  <input
                    name="allowedLongitude"
                    type="number"
                    step="0.000001"
                    defaultValue={selectedEmployee.allowedLongitude ?? ""}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Izinli Alan (metre)</span>
                  <input
                    name="allowedRadiusM"
                    type="number"
                    min="10"
                    defaultValue={selectedEmployee.allowedRadiusM ?? ""}
                    required
                  />
                </label>

                <label className={styles.checkField}>
                  <input name="isActive" type="checkbox" defaultChecked={selectedEmployee.isActive} />
                  <span>Personel aktif</span>
                </label>

                <SubmitButton
                  idleLabel="Personeli Guncelle"
                  pendingLabel="Guncelleniyor..."
                  className={styles.primaryButton}
                />
              </form>
            ) : (
              <p className={styles.emptyState}>Detay icin listeden personel sec.</p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
