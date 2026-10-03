import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { createEmployeeAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

export default async function NewEmployeePage() {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");
  assertPermission(authorization, PERMISSIONS.PERSONNEL_CREATE);
  if (!authorization.companyId) redirect("/dashboard");

  const [companies, departments, branches, managers] = await Promise.all([
    queryRepository.company.findMany({ where: { id: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.department.findMany({ where: { companyId: authorization.companyId, ...(authorization.scopeMode === "RESTRICTED" && authorization.departmentIds.length ? { id: { in: authorization.departmentIds } } : {}), isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    queryRepository.branch.findMany({ where: { companyId: authorization.companyId, ...(authorization.scopeMode === "RESTRICTED" && authorization.branchIds.length ? { id: { in: authorization.branchIds } } : {}), isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    queryRepository.manager.findMany({ where: { companyId: authorization.companyId, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Personel yönetimi</p><h1 className={ui.pageTitle}>Yeni Personel</h1><p className={ui.pageDescription}>Kimlik, organizasyon ve RFID bilgilerini düzenli bölümler halinde tamamlayın.</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/employees" className={ui.secondaryAction}><ArrowLeft size={16} />Personel listesi</Link></div>
      </header>

      {departments.length === 0 ? <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>Önce departman tanımlayın</h2><p>Personel kaydı için en az bir aktif departman gerekiyor.</p></div></div><Link href="/dashboard/settings/departments" className={ui.primaryAction}>Departman Ekle</Link></section> : (
        <form action={createEmployeeAction} className={ui.formShell} encType="multipart/form-data">
          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>Profil fotoğrafı</h2><p>Personel listelerinde kullanılacak kare veya dikey bir görsel seçin.</p></div>
            <div className={ui.profileCard}><div className={ui.profileImagePlaceholder}><UserRound size={28} /><span>Fotoğraf yok</span></div><label className={ui.formField}><span>Görsel dosyası</span><input name="photo" type="file" accept="image/*" /></label></div>
          </section>

          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>Kimlik ve iletişim</h2><p>Personelin temel bilgileri ve sisteme giriş bilgileri</p></div>
            <div className={ui.formGridThree}>
              <label className={ui.formField}><span>Ad</span><input name="firstName" required placeholder="Ahmet" /></label>
              <label className={ui.formField}><span>Soyad</span><input name="lastName" required placeholder="Yılmaz" /></label>
              <label className={ui.formField}><span>Yaş</span><input name="age" type="number" min="16" max="90" defaultValue={18} required /></label>
              <label className={ui.formField}><span>E-posta</span><input name="email" type="email" placeholder="ahmet@firma.com" /></label>
              <label className={ui.formField}><span>Şifre</span><input name="password" type="password" placeholder="Opsiyonel personel şifresi" /></label>
              <label className={ui.formField}><span>Sicil numarası</span><input name="registrationNumber" placeholder="PDKS sicil numarası" /></label>
            </div>
          </section>

          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>Organizasyon ve kart</h2><p>Firma, şube, departman, yönetici ve RFID ataması</p></div>
            <div className={ui.formGridThree}>
              <label className={ui.formField}><span>Firma</span><select name="companyId" required defaultValue={authorization.companyId}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
              <label className={ui.formField}><span>Departman</span><select name="department" required defaultValue=""><option value="" disabled>Departman seçin</option>{departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</select></label>
              <label className={ui.formField}><span>Şube</span><select name="branch" defaultValue=""><option value="">Merkez / belirtilmedi</option>{branches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select></label>
              <label className={ui.formField}><span>Bağlı yönetici</span><select name="managerName" defaultValue=""><option value="">Yönetici seçilmedi</option>{managers.map((manager) => <option key={manager.id} value={manager.name}>{manager.name}{manager.email ? ` · ${manager.email}` : ""}</option>)}</select></label>
              <label className={ui.formField}><span>RFID kart numarası</span><input name="rfidCardId" placeholder="Kart okutulduğunda gelen UID" /></label>
            </div>
          </section>

          <section className={ui.formSection}>
            <div className={ui.formSectionHeader}><h2>İstihdam tarihleri</h2><p>İşe giriş ve varsa ayrılış tarihi</p></div>
            <div className={ui.formGrid}>
              <label className={ui.formField}><span>İşe giriş tarihi</span><input name="hireDate" type="date" /></label>
              <label className={ui.formField}><span>Ayrılış tarihi</span><input name="terminationDate" type="date" /></label>
            </div>
          </section>

          <div className={ui.formActions}><SubmitButton idleLabel="Personeli Kaydet" pendingLabel="Kaydediliyor..." className={ui.primaryAction} /></div>
        </form>
      )}
    </div>
  );
}
