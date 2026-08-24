import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteCompanyAction,
  deleteCompanyDeviceAction,
  updateCompanyAction,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const tabs = [
  { key: "general", label: "Genel Bilgiler" },
  { key: "employees", label: "Personeller" },
  { key: "devices", label: "Cihazlar" },
  { key: "finance", label: "Mali Isler" },
] as const;

const cityOptions = ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Kocaeli"];
const districtOptions = ["Merkez", "Kadikoy", "Besiktas", "Sariyer", "Cankaya", "Nilufer"];
const purposeLabels = {
  ENTRY: "Giris okuyucusu",
  EXIT: "Cikis okuyucusu",
  BREAK_START: "Mola baslangic okuyucusu",
  BREAK_END: "Mola bitis okuyucusu",
  BIDIRECTIONAL: "Cift yonlu okuyucu",
} as const;

type TabKey = (typeof tabs)[number]["key"];

function getUserFullName(user: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

function buildCompanyUrl(companyId: string, tab: TabKey, extra?: Record<string, string>) {
  const params = new URLSearchParams({ tab });

  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/dashboard/companies/${companyId}?${params.toString()}`;
}

export default async function CompanyDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; employeeQ?: string; employeeId?: string; deviceId?: string }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const activeTab = tabs.some((tab) => tab.key === searchParams.tab)
    ? (searchParams.tab as TabKey)
    : "general";
  const employeeQuery = typeof searchParams.employeeQ === "string" ? searchParams.employeeQ.trim() : "";
  const selectedEmployeeId = typeof searchParams.employeeId === "string" ? searchParams.employeeId : "";

  const [company, categories] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: "COMPANY_ADMIN" },
          orderBy: { createdAt: "asc" },
        },
        employees: {
          where: employeeQuery
            ? {
                OR: [
                  { firstName: { contains: employeeQuery } },
                  { lastName: { contains: employeeQuery } },
                  { email: { contains: employeeQuery } },
                  { department: { contains: employeeQuery } },
                  { rfidCardId: { contains: employeeQuery } },
                ],
              }
            : undefined,
          orderBy: { createdAt: "desc" },
        },
        devices: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            employees: true,
            devices: true,
          },
        },
      },
    }),
    prisma.companyCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!company) {
    notFound();
  }

  const companyAdmin = company.users[0] ?? null;
  const selectedEmployee =
    company.employees.find((employee) => employee.id === selectedEmployeeId) ?? company.employees[0] ?? null;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Firma Detay Inceleme Sayfasi</p>
          <h1 className={styles.title}>{company.name}</h1>
          <p className={styles.subtitle}>
            Firmalar listesinden secilen musterinin genel bilgilerini, personellerini, cihazlarini ve mali islerini
            tek ekrandan takip edebilirsin.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.rolePill}>{company._count.employees} personel</div>
          <div className={styles.helperText}>{company._count.devices} cihaz kayitli</div>
        </div>
      </section>

      <nav className={`glass-panel ${styles.tabBar}`} aria-label="Firma detay sekmeleri">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={buildCompanyUrl(company.id, tab.key)}
            className={activeTab === tab.key ? styles.tabLinkActive : styles.tabLink}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "general" ? (
        <section className={`glass-panel ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Genel Bilgiler</p>
              <h2 className={styles.sectionTitle}>Firma ve Admin Bilgileri</h2>
            </div>
          </div>

          <form action={updateCompanyAction} className={styles.formGrid}>
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="adminId" value={companyAdmin?.id ?? ""} />

            <label className={styles.field}>
              <span>Firma Adi</span>
              <input name="companyName" defaultValue={company.name} required />
            </label>

            <label className={`${styles.checkField} ${styles.formActionAlign}`}>
              <input name="isActive" type="checkbox" defaultChecked={company.isActive} />
              <span>Firma aktif</span>
            </label>

            <label className={styles.field}>
              <span>Admin Adi</span>
              <input name="adminFirstName" defaultValue={companyAdmin?.firstName ?? ""} required />
            </label>

            <label className={styles.field}>
              <span>Admin Soyadi</span>
              <input name="adminLastName" defaultValue={companyAdmin?.lastName ?? ""} required />
            </label>

            <label className={styles.field}>
              <span>Firma E posta</span>
              <input name="contactEmail" type="email" defaultValue={company.contactEmail ?? ""} />
            </label>

            <label className={styles.field}>
              <span>Firma Tel</span>
              <input name="contactPhone" defaultValue={company.contactPhone ?? ""} />
            </label>

            <label className={styles.field}>
              <span>Admin Mail</span>
              <input name="adminEmail" type="email" defaultValue={companyAdmin?.email ?? ""} required />
            </label>

            <label className={styles.field}>
              <span>Admin Sifre</span>
              <input name="adminPassword" type="password" placeholder="Degistirmek istemiyorsan bos birak" />
            </label>

            <label className={styles.field}>
              <span>Il</span>
              <select name="city" defaultValue={company.city ?? ""}>
                <option value="">Seciniz</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Ilce</span>
              <select name="district" defaultValue={company.district ?? ""}>
                <option value="">Seciniz</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Firma Kategori</span>
              <select name="category" defaultValue={company.category ?? ""}>
                <option value="">Seciniz</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Yetkili Kisi</span>
              <input name="contactName" defaultValue={company.contactName ?? ""} />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>Firma Adres</span>
              <textarea name="address" rows={4} defaultValue={company.address ?? ""} />
            </label>

            <div className={styles.fullWidth}>
              <SubmitButton
                idleLabel="Genel Bilgileri Kaydet"
                pendingLabel="Kaydediliyor..."
                className={styles.primaryButton}
              />
            </div>
          </form>

          <form action={deleteCompanyAction} className={styles.dangerForm}>
            <input type="hidden" name="companyId" value={company.id} />
            <SubmitButton
              idleLabel="Firmayi Sil"
              pendingLabel="Siliniyor..."
              className={styles.dangerButton}
            />
          </form>
        </section>
      ) : null}

      {activeTab === "employees" ? (
        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Personeller</p>
                  <h2 className={styles.sectionTitle}>Firma Personel Listesi</h2>
                </div>
              </div>

              <form className={styles.searchForm}>
                <input type="hidden" name="tab" value="employees" />
                <input name="employeeQ" defaultValue={employeeQuery} placeholder="Personel arama textboxu" />
                <button type="submit">Arama</button>
              </form>

              <div className={styles.logList}>
                {company.employees.length === 0 ? (
                  <p className={styles.emptyState}>Bu firmada aramana uygun personel bulunamadi.</p>
                ) : (
                  company.employees.map((employee) => (
                    <Link
                      key={employee.id}
                      href={buildCompanyUrl(company.id, "employees", {
                        employeeQ: employeeQuery,
                        employeeId: employee.id,
                      })}
                      className={selectedEmployee?.id === employee.id ? styles.listItemActive : styles.listItemLink}
                    >
                      <div>
                        <p className={styles.logTitle}>
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className={styles.logMeta}>{employee.department}</p>
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
          </div>

          <aside className={styles.sideColumn}>
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Personel Detayi</p>
                  <h2 className={styles.sectionTitle}>Secili Personel Bilgileri</h2>
                </div>
              </div>

              {selectedEmployee ? (
                <div className={styles.detailList}>
                  <p>
                    <span>Ad Soyad</span>
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </p>
                  <p>
                    <span>Departman</span>
                    {selectedEmployee.department}
                  </p>
                  <p>
                    <span>Yas</span>
                    {selectedEmployee.age}
                  </p>
                  <p>
                    <span>E-posta</span>
                    {selectedEmployee.email ?? "-"}
                  </p>
                  <p>
                    <span>RFID Kart ID</span>
                    {selectedEmployee.rfidCardId ?? "Kart atanmadi"}
                  </p>
                </div>
              ) : (
                <p className={styles.emptyState}>Detay icin listeden personel sec.</p>
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeTab === "devices" ? (
        <section className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Cihazlar</p>
                <h2 className={styles.sectionTitle}>Firma RFID Cihaz Listesi</h2>
              </div>
              <Link href={`/dashboard/companies/${company.id}/devices/new`} className={styles.primaryLinkButton}>
                Cihaz Ekle
              </Link>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Cihaz Adi</th>
                    <th>MAC</th>
                    <th>IP</th>
                    <th>Sube/Lokasyon</th>
                    <th>Amac</th>
                    <th>Durum</th>
                    <th>Son Baglanti</th>
                    <th>Saat Farki</th>
                    <th>Son Veri</th>
                    <th>Secret</th>
                    <th>Islem</th>
                    <th>Sil</th>
                  </tr>
                </thead>
                <tbody>
                  {company.devices.length === 0 ? (
                    <tr>
                      <td colSpan={13} className={styles.emptyCell}>
                        Bu firmaya tanimli cihaz yok.
                      </td>
                    </tr>
                  ) : (
                    company.devices.map((device) => (
                      <tr key={device.id}>
                        <td>{device.code ?? "-"}</td>
                        <td>{device.name}</td>
                        <td className={styles.monoCell}>{device.macAddress ?? "-"}</td>
                        <td>{device.ipAddress ?? "-"}</td>
                        <td>{device.branchLocation ?? "-"}</td>
                        <td>{purposeLabels[device.purpose]}</td>
                        <td>
                          <span className={device.lastSeenAt ? styles.statusActive : styles.statusPassive}>
                            {device.lastSeenAt ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td>{device.lastSeenAt ? device.lastSeenAt.toLocaleString("tr-TR") : "-"}</td>
                        <td>{device.clockOffsetMinutes ?? 0} dk</td>
                        <td>{device.lastDataTransferAt ? device.lastDataTransferAt.toLocaleString("tr-TR") : "-"}</td>
                        <td className={styles.monoCell}>{device.secretKey}</td>
                        <td>
                          <Link
                            href={`/dashboard/companies/${company.id}/devices/${device.id}`}
                            className={styles.inlineAction}
                          >
                            Incele
                          </Link>
                        </td>
                        <td>
                          <form action={deleteCompanyDeviceAction}>
                            <input type="hidden" name="companyId" value={company.id} />
                            <input type="hidden" name="deviceId" value={device.id} />
                            <SubmitButton idleLabel="Sil" pendingLabel="..." className={styles.dangerMiniButton} />
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "finance" ? (
        <section className={`glass-panel ${styles.sectionCard}`}>
          <p className={styles.sectionEyebrow}>Mali Isler</p>
          <h2 className={styles.sectionTitle}>Mali Isler Hazirlik Alani</h2>
          <p className={styles.emptyState}>
            Bu tab PDF revizesindeki 4. alan olarak eklendi. Faturalama, paket, lisans ve odeme takibi detaylarini
            sonraki fazda buraya baglayabiliriz.
          </p>
        </section>
      ) : null}
    </div>
  );
}
