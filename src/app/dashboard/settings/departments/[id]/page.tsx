import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteDepartmentAction, updateDepartmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { queryRepository } from "@/modules/shared/query-repository";
import { parseRouteId } from "@/lib/ids";
import { requireSessionUser } from "@/lib/session";
import { DepartmentFormFields } from "../department-form";
import styles from "../../../page.module.css";
import ui from "../../../management.module.css";

export default async function DepartmentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !authorization.companyId) redirect("/dashboard");

  const id = parseRouteId((await props.params).id);
  const [department, categories] = await Promise.all([
    queryRepository.department.findFirst({ where: { id, companyId: authorization.companyId }, include: { _count: { select: { employees: true } } } }),
    queryRepository.departmentCategory.findMany({ where: { companyId: authorization.companyId }, orderBy: { name: "asc" } }),
  ]);
  if (!department) notFound();

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Departman · {department._count.employees} personel</p><h1 className={ui.pageTitle}>{department.name}</h1><p className={ui.pageDescription}>Departman adını, kategorisini ve kullanım durumunu güncelleyin.</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/settings/departments" className={ui.secondaryAction}><ArrowLeft size={16} />Departmanlar</Link></div>
      </header>
      <form action={updateDepartmentAction} className={ui.formShell}>
        <input type="hidden" name="returnTo" value="/dashboard/settings/departments" />
        <input type="hidden" name="departmentId" value={department.id} />
        <DepartmentFormFields categories={categories} name={department.name} categoryId={department.categoryId} isActive={department.isActive} submitLabel="Değişiklikleri Kaydet" />
      </form>
      <section className={ui.dangerZone}>
        <div><h3>Departmanı sil</h3><p>Personel veya takvim kaydında kullanılan departman silinemez; bunun yerine pasif yapın.</p></div>
        <form action={deleteDepartmentAction}><input type="hidden" name="departmentId" value={department.id} /><SubmitButton idleLabel="Departmanı Sil" pendingLabel="Siliniyor..." className={ui.dangerAction} /></form>
      </section>
    </div>
  );
}
