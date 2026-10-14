import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createDepartmentCategoryAction, deleteDepartmentCategoryAction, updateDepartmentCategoryAction } from "@/modules/settings/definition-actions";
import { queryRepository } from "@/modules/shared/query-repository";
import { SimpleDefinitionPage } from "../simple-definition-page";

export default async function DepartmentCategoriesPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.SETTINGS_MANAGE)) redirect("/dashboard");

  const categories = await queryRepository.departmentCategory.findMany({
    where: { companyId: authorization.companyId },
    include: { _count: { select: { departments: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <SimpleDefinitionPage
      title="Departman Kategorileri"
      description="Departmanları üst gruplara ayırın (ör. Üretim, İdari, Satış). Personel kategorisini bağlı olduğu departmandan alır ve bütçe raporu bu gruplara göre özetlenir."
      placeholder="Üretim, İdari, Satış ve Pazarlama..."
      usageLabel="departman"
      items={categories.map((item) => ({ id: item.id, name: item.name, isActive: item.isActive, usage: item._count.departments }))}
      createAction={createDepartmentCategoryAction}
      updateAction={updateDepartmentCategoryAction}
      deleteAction={deleteDepartmentCategoryAction}
    />
  );
}
