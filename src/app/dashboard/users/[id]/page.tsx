import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { deleteDashboardUserAction, updateDashboardUserAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

export default async function UserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const { id } = await props.params;
  const [record, companies, devices] = await Promise.all([
    prisma.user.findFirst({
      where: { id },
      include: {
        companyAccess: true,
        deviceAccess: true,
      },
    }),
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.device.findMany({ include: { company: true }, orderBy: [{ company: { name: "asc" } }, { name: "asc" }] }),
  ]);

  if (!record) notFound();

  const selectedCompanyIds = new Set(record.companyAccess.map((access) => access.companyId));
  if (record.companyId) selectedCompanyIds.add(record.companyId);
  const selectedDeviceIds = new Set(record.deviceAccess.map((access) => access.deviceId));
  const selectedCompanyIdList = Array.from(selectedCompanyIds);
  const [visibleEmployees, visibleDevices] = await Promise.all([
    prisma.employee.findMany({
      where: selectedCompanyIdList.length > 0 ? { companyId: { in: selectedCompanyIdList } } : { id: "__none__" },
      include: { company: true },
      orderBy: [{ company: { name: "asc" } }, { firstName: "asc" }],
      take: 20,
    }),
    prisma.device.findMany({
      where: selectedDeviceIds.size > 0
        ? { id: { in: Array.from(selectedDeviceIds) } }
        : selectedCompanyIdList.length > 0
          ? { companyId: { in: selectedCompanyIdList } }
          : { id: "__none__" },
      include: { company: true },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
      take: 20,
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Kullanici Detay</p>
          <h1 className={styles.title}>{record.name ?? record.email}</h1>
          <p className={styles.subtitle}>Firma ve RFID cihaz yetkilerini bu ekrandan duzenle.</p>
        </div>
        <BackLink href="/dashboard/users" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateDashboardUserAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/users" />
          <input type="hidden" name="userId" value={record.id} />
          <label className={styles.field}><span>Ad</span><input name="firstName" defaultValue={record.firstName ?? ""} required /></label>
          <label className={styles.field}><span>Soyad</span><input name="lastName" defaultValue={record.lastName ?? ""} required /></label>
          <label className={styles.field}><span>E-posta</span><input name="email" type="email" defaultValue={record.email} required /></label>
          <label className={styles.field}><span>Yeni Sifre</span><input name="password" type="password" placeholder="Degistirmek istemiyorsan bos birak" /></label>
          <label className={styles.field}><span>Rol</span><input value={record.role === "SUPERADMIN" ? "Super Admin" : "Firma Admin"} readOnly /></label>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <span>Yetkili Oldugu Firmalar</span>
            <div className={styles.checkListGrid}>
              {companies.map((company) => (
                <label key={company.id} className={styles.checkField}>
                  <input name="companyIds" type="checkbox" value={company.id} defaultChecked={selectedCompanyIds.has(company.id)} />
                  <span>{company.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <span>Yetkili Oldugu Cihazlar</span>
            <div className={styles.checkListGrid}>
              {devices.map((device) => (
                <label key={device.id} className={styles.checkField}>
                  <input name="deviceIds" type="checkbox" value={device.id} defaultChecked={selectedDeviceIds.has(device.id)} />
                  <span>{device.company.name} / {device.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Kullaniciyi Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
          </div>
        </form>

        <form action={deleteDashboardUserAction} className={styles.dangerForm}>
          <input type="hidden" name="userId" value={record.id} />
          <SubmitButton idleLabel="Kullaniciyi Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
        </form>
      </section>

      <section className={styles.cardGridWide}>
        <div className={`glass-panel ${styles.sectionCard}`}>
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
        </div>

        <div className={`glass-panel ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Kapsam</p>
              <h2 className={styles.sectionTitle}>Cihaz Bilgileri</h2>
            </div>
            <span className={styles.countPill}>{visibleDevices.length} kayit</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Cihaz</th><th>Firma</th><th>MAC</th><th>Lokasyon</th></tr></thead>
              <tbody>
                {visibleDevices.length === 0 ? (
                  <tr><td colSpan={4} className={styles.emptyCell}>Cihaz kaydi yok.</td></tr>
                ) : visibleDevices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.name}</td>
                    <td>{device.company.name}</td>
                    <td className={styles.monoCell}>{device.macAddress ?? "-"}</td>
                    <td>{device.branchLocation ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
