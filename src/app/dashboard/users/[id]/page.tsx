import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import {
  createUserDeviceAction,
  deleteDashboardUserAction,
  deleteUserDeviceAccessAction,
  updateDashboardUserAction,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { DevicePurpose, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const tabs = [
  { key: "general", label: "Genel Bilgiler" },
  { key: "personnel", label: "Personel Bilgileri" },
  { key: "devices", label: "Cihaz Bilgileri" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const roleLabels: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Firma Admin",
  EMPLOYEE: "Personel",
};

const purposeLabels: Record<DevicePurpose, string> = {
  ENTRY: "Giris okuyucusu",
  EXIT: "Cikis okuyucusu",
  BREAK_START: "Mola baslangic okuyucusu",
  BREAK_END: "Mola bitis okuyucusu",
  BIDIRECTIONAL: "Cift yonlu okuyucu",
};

function buildUserUrl(userId: string, tab: TabKey) {
  return `/dashboard/users/${userId}?tab=${tab}`;
}

export default async function UserDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
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

  const [record, roleDefinitions] = await Promise.all([
    prisma.user.findFirst({
      where: { id },
      include: {
        companyAccess: { include: { company: true }, orderBy: { createdAt: "asc" } },
        deviceAccess: {
          include: { device: { include: { company: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.roleDefinition.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!record) notFound();

  const selectedCompanyIds = new Set(record.companyAccess.map((access) => access.companyId));
  if (record.companyId) selectedCompanyIds.add(record.companyId);
  const selectedDeviceIds = new Set(record.deviceAccess.map((access) => access.deviceId));
  const selectedCompanyIdList = Array.from(selectedCompanyIds);
  const roleOptions = roleDefinitions.length > 0
    ? roleDefinitions.map((role) => ({ code: role.code, name: role.name }))
    : Object.values(Role).map((role) => ({ code: role, name: roleLabels[role] }));

  if (!roleOptions.some((role) => role.code === record.role)) {
    roleOptions.push({ code: record.role, name: roleLabels[record.role] });
  }

  const [visibleEmployees, visibleDevices] = await Promise.all([
    prisma.employee.findMany({
      where: selectedCompanyIdList.length > 0 ? { companyId: { in: selectedCompanyIdList } } : { id: "__none__" },
      include: { company: true },
      orderBy: [{ company: { name: "asc" } }, { firstName: "asc" }],
      take: 100,
    }),
    prisma.device.findMany({
      where: selectedDeviceIds.size > 0
        ? { id: { in: Array.from(selectedDeviceIds) } }
        : { id: "__none__" },
      include: { company: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Kullanici Detay</p>
          <h1 className={styles.title}>{record.name ?? record.email}</h1>
          <p className={styles.subtitle}>
            Kullanici genel bilgilerini, firma kapsamindaki personelleri ve RFID cihaz atamalarini sekmelerden yonet.
          </p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <nav className={`glass-panel ${styles.tabBar}`} aria-label="Kullanici detay sekmeleri">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={buildUserUrl(record.id, tab.key)}
            className={activeTab === tab.key ? styles.tabLinkActive : styles.tabLink}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "general" ? (
        <section className={`glass-panel ${styles.sectionCard}`}>
          <form action={updateDashboardUserAction} className={styles.formGrid}>
            <input type="hidden" name="returnTo" value={`/dashboard/users/${record.id}?tab=general`} />
            <input type="hidden" name="userId" value={record.id} />
            <label className={styles.field}><span>Ad</span><input name="firstName" defaultValue={record.firstName ?? ""} required /></label>
            <label className={styles.field}><span>Soyad</span><input name="lastName" defaultValue={record.lastName ?? ""} required /></label>
            <label className={styles.field}><span>E-posta</span><input name="email" type="email" defaultValue={record.email} required /></label>
            <label className={styles.field}><span>Yeni Sifre</span><input name="password" type="password" placeholder="Degistirmek istemiyorsan bos birak" /></label>
            <label className={styles.field}>
              <span>Rol</span>
              <select name="role" defaultValue={record.role}>
                {roleOptions.map((role) => (
                  <option key={role.code} value={role.code}>{role.name}</option>
                ))}
              </select>
            </label>

            {selectedCompanyIdList.map((companyId) => (
              <input key={companyId} type="hidden" name="companyIds" value={companyId} />
            ))}
            {record.deviceAccess.map((access) => (
              <input key={access.deviceId} type="hidden" name="deviceIds" value={access.deviceId} />
            ))}

            <div className={styles.fullWidthActionRow}>
              <SubmitButton idleLabel="Kullaniciyi Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
            </div>
          </form>

          <form action={deleteDashboardUserAction} className={styles.dangerForm}>
            <input type="hidden" name="userId" value={record.id} />
            <SubmitButton idleLabel="Kullaniciyi Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
          </form>
        </section>
      ) : null}

      {activeTab === "personnel" ? (
        <section className={`glass-panel ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Kapsam</p>
              <h2 className={styles.sectionTitle}>Personel Bilgileri</h2>
            </div>
            <span className={styles.countPill}>{visibleEmployees.length} kayit</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Personel</th><th>Firma</th><th>Departman</th><th>RFID</th></tr></thead>
              <tbody>
                {visibleEmployees.length === 0 ? (
                  <tr><td colSpan={4} className={styles.emptyCell}>Personel kaydi yok.</td></tr>
                ) : visibleEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.firstName} {employee.lastName}</td>
                    <td>{employee.company.name}</td>
                    <td>{employee.department}</td>
                    <td className={styles.monoCell}>{employee.rfidCardId ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "devices" ? (
        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Atanan Cihazlar</p>
                  <h2 className={styles.sectionTitle}>Cihaz Bilgileri</h2>
                </div>
                <span className={styles.countPill}>{visibleDevices.length} kayit</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Cihaz</th><th>Firma</th><th>MAC</th><th>Kullanim</th><th>Islem</th></tr></thead>
                  <tbody>
                    {visibleDevices.length === 0 ? (
                      <tr><td colSpan={5} className={styles.emptyCell}>Kullaniciya atanmis cihaz yok.</td></tr>
                    ) : visibleDevices.map((device) => (
                      <tr key={device.id}>
                        <td>{device.name}</td>
                        <td>{device.company?.name ?? "Firma atanmadi"}</td>
                        <td className={styles.monoCell}>{device.macAddress ?? "-"}</td>
                        <td>{purposeLabels[device.purpose]}</td>
                        <td>
                          <form action={deleteUserDeviceAccessAction}>
                            <input type="hidden" name="userId" value={record.id} />
                            <input type="hidden" name="deviceId" value={device.id} />
                            <SubmitButton idleLabel="Kaldir" pendingLabel="Kaldiriliyor..." className={styles.smallButton} />
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>

          <aside className={styles.sideColumn}>
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Yeni Cihaz</p>
                  <h2 className={styles.sectionTitle}>Cihaz Ekle ve Ata</h2>
                </div>
              </div>
              <form action={createUserDeviceAction} className={styles.formGrid}>
                <input type="hidden" name="userId" value={record.id} />
                <label className={styles.field}><span>Cihaz Kodu</span><input name="code" placeholder="RFID-01" /></label>
                <label className={styles.field}><span>Cihaz Adi</span><input name="name" required placeholder="Ana Giris Okuyucu" /></label>
                <label className={styles.field}><span>MAC Adresi</span><input name="macAddress" required placeholder="AA-BB-CC-DD-EE-FF" /></label>
                <label className={styles.field}><span>IP Adresi</span><input name="ipAddress" placeholder="192.168.1.20" /></label>
                <label className={styles.field}>
                  <span>Kullanim Amaci</span>
                  <select name="purpose" defaultValue={DevicePurpose.BIDIRECTIONAL}>
                    {Object.values(DevicePurpose).map((purpose) => (
                      <option key={purpose} value={purpose}>{purposeLabels[purpose]}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}><span>Saat Farki (dk)</span><input name="clockOffsetMinutes" type="number" defaultValue={0} /></label>
                <div className={styles.fullWidthActionRow}>
                  <SubmitButton idleLabel="Cihaz Ekle" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
                </div>
              </form>
            </section>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
