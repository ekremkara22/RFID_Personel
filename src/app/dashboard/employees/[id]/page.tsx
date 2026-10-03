import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { deleteEmployeeAction, updateEmployeeAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { employeeScopeWhere } from "@/lib/authorization";
import { parseRouteId } from "@/lib/ids";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

export default async function EmployeeDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const id = parseRouteId((await props.params).id);
  const [employee, companies, departments, branches, managers] = await Promise.all([
    queryRepository.employee.findFirst({ where: { id, ...employeeScopeWhere(authorization) } }),
    queryRepository.company.findMany({ where: { id: authorization.companyId!, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.department.findMany({ where: { companyId: authorization.companyId!, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    queryRepository.branch.findMany({ where: { companyId: authorization.companyId!, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    queryRepository.manager.findMany({ where: { companyId: authorization.companyId!, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
  ]);
  if (!employee) notFound();

  const currentCompanyName = companies.find((company) => company.id === employee.companyId)?.name ?? "Mevcut firma";
  const departmentOptions = departments.map((department) => ({ id: department.id, name: department.name, companyName: department.company.name }));
  if (!departmentOptions.some((department) => department.name === employee.department)) departmentOptions.unshift({ id: 0, name: employee.department, companyName: currentCompanyName });

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Personel kaydı</p><h1 className={ui.pageTitle}>{employee.firstName} {employee.lastName}</h1><p className={ui.pageDescription}>Personelin kimlik, organizasyon, istihdam ve RFID bilgilerini yönetin.</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/employees" className={ui.secondaryAction}><ArrowLeft size={16} />Personel listesi</Link></div>
      </header>

      <form action={updateEmployeeAction} className={ui.formShell} encType="multipart/form-data">
        <input type="hidden" name="employeeId" value={employee.id} />
        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Profil fotoğrafı</h2><p>Liste ve personel kartlarında sabit ölçüde gösterilir.</p></div>
          <div className={ui.profileCard}>
            {employee.photoUrl ? <div className={ui.profileImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
            </div> : <div className={ui.profileImagePlaceholder}><UserRound size={28} /><span>Fotoğraf yok</span></div>}
            <label className={ui.formField}><span>Fotoğrafı değiştir</span><input name="photo" type="file" accept="image/*" /></label>
          </div>
        </section>

        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Kimlik ve iletişim</h2><p>Temel personel ve hesap bilgileri</p></div>
          <div className={ui.formGridThree}>
            <label className={ui.formField}><span>Ad</span><input name="firstName" defaultValue={employee.firstName} required /></label>
            <label className={ui.formField}><span>Soyad</span><input name="lastName" defaultValue={employee.lastName} required /></label>
            <label className={ui.formField}><span>Yaş</span><input name="age" type="number" defaultValue={employee.age} min="16" max="90" required /></label>
            <label className={ui.formField}><span>E-posta</span><input name="email" type="email" defaultValue={employee.email ?? ""} /></label>
            <label className={ui.formField}><span>Yeni şifre</span><input name="password" type="password" placeholder="Değişmeyecekse boş bırakın" /></label>
            <label className={ui.formField}><span>Sicil numarası</span><input name="registrationNumber" defaultValue={employee.registrationNumber ?? ""} /></label>
          </div>
        </section>

        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Organizasyon ve kart</h2><p>Görev yeri, yönetici ve RFID ataması</p></div>
          <div className={ui.formGridThree}>
            <label className={ui.formField}><span>Firma</span><select name="companyId" defaultValue={employee.companyId} required>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label className={ui.formField}><span>Departman</span><select name="department" defaultValue={employee.department} required>{departmentOptions.map((department) => <option key={department.id} value={department.name}>{department.companyName} / {department.name}</option>)}</select></label>
            <label className={ui.formField}><span>Şube</span><select name="branch" defaultValue={employee.branch ?? ""}><option value="">Merkez / belirtilmedi</option>{branches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select></label>
            <label className={ui.formField}><span>Bağlı yönetici</span><select name="managerName" defaultValue={employee.managerName ?? ""}><option value="">Yönetici seçilmedi</option>{employee.managerName && !managers.some((manager) => manager.name === employee.managerName) ? <option value={employee.managerName}>{employee.managerName}</option> : null}{managers.map((manager) => <option key={manager.id} value={manager.name}>{manager.name}{manager.email ? ` · ${manager.email}` : ""}</option>)}</select></label>
            <label className={ui.formField}><span>RFID kart numarası</span><input name="rfidCardId" defaultValue={employee.rfidCardId ?? ""} placeholder="Kart okutulduğunda gelen UID" /></label>
            <label className={ui.checkField}><input name="isActive" type="checkbox" defaultChecked={employee.isActive} /><span>Personel aktif</span></label>
          </div>
        </section>

        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>İstihdam tarihleri</h2><p>İşe giriş ve varsa ayrılış tarihi</p></div>
          <div className={ui.formGrid}>
            <label className={ui.formField}><span>İşe giriş tarihi</span><input name="hireDate" type="date" defaultValue={employee.hireDate ? employee.hireDate.toISOString().slice(0, 10) : ""} /></label>
            <label className={ui.formField}><span>Ayrılış tarihi</span><input name="terminationDate" type="date" defaultValue={employee.terminationDate ? employee.terminationDate.toISOString().slice(0, 10) : ""} /></label>
          </div>
        </section>

        <div className={ui.formActions}><SubmitButton idleLabel="Değişiklikleri Kaydet" pendingLabel="Güncelleniyor..." className={ui.primaryAction} /></div>
      </form>

      <section className={ui.dangerZone}><div><h3>Personeli pasife al</h3><p>Geçmiş hareketler korunur; personel yeni işlemlerde aktif görünmez.</p></div><form action={deleteEmployeeAction}><input type="hidden" name="employeeId" value={employee.id} /><SubmitButton idleLabel="Personeli Pasife Al" pendingLabel="Pasife alınıyor..." className={ui.dangerAction} /></form></section>
    </div>
  );
}
