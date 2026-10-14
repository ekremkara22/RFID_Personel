import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createDepartmentAction } from "@/app/dashboard/actions";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import { DepartmentFormFields } from "../department-form";
import styles from "../../../page.module.css";
import ui from "../../../management.module.css";

export default async function NewDepartmentPage() {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !authorization.companyId) redirect("/dashboard");
  const categories = await queryRepository.departmentCategory.findMany({ where: { companyId: authorization.companyId }, orderBy: { name: "asc" } });

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Sabit tanımlar</p><h1 className={ui.pageTitle}>Departman Ekle</h1><p className={ui.pageDescription}>Yeni departmanı ve bağlı olduğu kategoriyi tanımlayın.</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/settings/departments" className={ui.secondaryAction}><ArrowLeft size={16} />Departmanlar</Link></div>
      </header>
      <form action={createDepartmentAction} className={ui.formShell}>
        <input type="hidden" name="returnTo" value="/dashboard/settings/departments" />
        <DepartmentFormFields categories={categories} submitLabel="Departmanı Kaydet" />
      </form>
    </div>
  );
}
