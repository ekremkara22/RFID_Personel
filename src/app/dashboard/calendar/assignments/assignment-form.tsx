"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/app/dashboard/submit-button";
import styles from "../../../page.module.css";
import formStyles from "./assignment-form.module.css";

const calendarScopeTypes = ["COMPANY", "BRANCH", "DEPARTMENT", "EMPLOYEE"] as const;
type CalendarScopeType = (typeof calendarScopeTypes)[number];

const scopeLabels: Record<CalendarScopeType, string> = {
  COMPANY: "Sirket",
  BRANCH: "Sube",
  DEPARTMENT: "Departman",
  EMPLOYEE: "Personel",
};

type CompanyOption = {
  id: number;
  name: string;
};

type TemplateOption = {
  id: number;
  name: string;
  companyId: number;
};

type BranchOption = {
  id: number;
  name: string;
  companyId: number;
};

type DepartmentOption = {
  id: number;
  name: string;
  companyId: number;
};

type EmployeeOption = {
  id: number;
  name: string;
  companyId: number;
};

type AssignmentFormValues = {
  assignmentId?: number;
  companyId?: number;
  calendarTemplateId?: number;
  scopeType?: CalendarScopeType;
  branchId?: number | null;
  departmentId?: number | null;
  employeeId?: number | null;
  validFrom?: string;
  validTo?: string;
  priority?: number;
  description?: string | null;
  conflictReason?: string | null;
  conflictApproved?: boolean;
  isActive?: boolean;
};

export function AssignmentForm({
  action,
  companies,
  templates,
  branches,
  departments,
  employees,
  values,
  submitLabel,
  pendingLabel,
  returnTo = "/dashboard/calendar/assignments",
  lockCompany = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  templates: TemplateOption[];
  branches: BranchOption[];
  departments: DepartmentOption[];
  employees: EmployeeOption[];
  values?: AssignmentFormValues;
  submitLabel: string;
  pendingLabel: string;
  returnTo?: string;
  lockCompany?: boolean;
}) {
  const initialCompanyId = values?.companyId || companies[0]?.id || 0;
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [scopeType, setScopeType] = useState<CalendarScopeType>(values?.scopeType ?? "COMPANY");
  const selectedCompanyName = companies.find((company) => company.id === companyId)?.name ?? "";

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.companyId === companyId),
    [companyId, templates],
  );
  const filteredBranches = useMemo(
    () => branches.filter((branch) => branch.companyId === companyId),
    [branches, companyId],
  );
  const filteredDepartments = useMemo(
    () => departments.filter((department) => department.companyId === companyId),
    [companyId, departments],
  );
  const filteredEmployees = useMemo(
    () => employees.filter((employee) => employee.companyId === companyId),
    [companyId, employees],
  );

  return (
    <form action={action} className={formStyles.form}>
      <input type="hidden" name="returnTo" value={returnTo} />
      {values?.assignmentId ? <input type="hidden" name="assignmentId" value={values.assignmentId} /> : null}

      <section className={formStyles.section}>
        <div className={formStyles.sectionHeading}>
          <span>1</span><div><h2>Takvim ve firma</h2><p>Uygulanacak çalışma düzenini seçin.</p></div>
        </div>
        <div className={formStyles.grid}>
          {lockCompany ? (
            <label className={formStyles.field}><span>Firma</span><input value={selectedCompanyName} readOnly /><input type="hidden" name="companyId" value={companyId} /></label>
          ) : (
            <label className={formStyles.field}><span>Firma</span><select name="companyId" required value={companyId} onChange={(event) => setCompanyId(Number(event.target.value))}><option value="" disabled>Firma seçin</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          )}
          <label className={formStyles.field}><span>Takvim şablonu</span><select name="calendarTemplateId" required defaultValue={values?.calendarTemplateId ?? ""} key={companyId}><option value="" disabled>Şablon seçin</option>{filteredTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><small>{filteredTemplates.length} kullanılabilir şablon</small></label>
        </div>
      </section>

      <section className={formStyles.section}>
        <div className={formStyles.sectionHeading}>
          <span>2</span><div><h2>Atama kapsamı</h2><p>Takvimin kimlere uygulanacağını belirleyin.</p></div>
        </div>
        <div className={formStyles.scopeGrid}>
          {calendarScopeTypes.map((scope) => (
            <label key={scope} className={`${formStyles.scopeOption} ${scopeType === scope ? formStyles.scopeOptionActive : ""}`}>
              <input type="radio" name="scopeType" value={scope} checked={scopeType === scope} onChange={() => setScopeType(scope)} />
              <strong>{scopeLabels[scope]}</strong>
            </label>
          ))}
        </div>
        {scopeType !== "COMPANY" ? (
          <div className={formStyles.targetRow}>
            {scopeType === "BRANCH" ? <label className={formStyles.field}><span>Şube</span><select name="branchId" required defaultValue={values?.branchId ?? ""} key={`${companyId}-branch`}><option value="">Şube seçin</option>{filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : null}
            {scopeType === "DEPARTMENT" ? <label className={formStyles.field}><span>Departman</span><select name="departmentId" required defaultValue={values?.departmentId ?? ""} key={`${companyId}-department`}><option value="">Departman seçin</option>{filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label> : null}
            {scopeType === "EMPLOYEE" ? <label className={formStyles.field}><span>Personel</span><select name="employeeId" required defaultValue={values?.employeeId ?? ""} key={`${companyId}-employee`}><option value="">Personel seçin</option>{filteredEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label> : null}
          </div>
        ) : <p className={formStyles.scopeInfo}>Bu takvim firmadaki tüm uygun personele uygulanır.</p>}
      </section>

      <section className={formStyles.section}>
        <div className={formStyles.sectionHeading}>
          <span>3</span><div><h2>Tarih ve kurallar</h2><p>Geçerlilik aralığını ve çakışma davranışını ayarlayın.</p></div>
        </div>
        <div className={formStyles.gridThree}>
          <label className={formStyles.field}><span>Başlangıç</span><input name="validFrom" type="date" required defaultValue={values?.validFrom ?? ""} /></label>
          <label className={formStyles.field}><span>Bitiş</span><input name="validTo" type="date" defaultValue={values?.validTo ?? ""} /><small>Boş bırakılırsa süresizdir.</small></label>
          <label className={formStyles.field}><span>Öncelik</span><input name="priority" type="number" min="0" defaultValue={values?.priority ?? 100} /><small>Düşük sayı önce uygulanır.</small></label>
        </div>
        <div className={formStyles.grid}>
          <label className={formStyles.field}><span>Açıklama</span><textarea name="description" defaultValue={values?.description ?? ""} placeholder="Atamanın amacını yazın" /></label>
          <label className={formStyles.field}><span>Çakışma onay açıklaması</span><textarea name="conflictReason" defaultValue={values?.conflictReason ?? ""} placeholder="Yalnızca bilinçli bir çakışma varsa doldurun" /></label>
        </div>
        <div className={formStyles.checkGrid}>
          <label className={formStyles.checkCard}><input name="conflictApproved" type="checkbox" defaultChecked={values?.conflictApproved ?? false} /><span><strong>Çakışmayı onayla</strong><small>Örtüşen atamanın bilinçli olduğunu belirtir.</small></span></label>
          {typeof values?.isActive === "boolean" ? <label className={formStyles.checkCard}><input name="isActive" type="checkbox" defaultChecked={values.isActive} /><span><strong>Atama aktif</strong><small>Pasif atamalar hesaplamaya katılmaz.</small></span></label> : null}
        </div>
        {values?.assignmentId ? <label className={formStyles.field}><span>Değişiklik nedeni</span><input name="changeReason" required placeholder="Bu düzenlemeyi neden yaptınız?" /></label> : null}
      </section>

      <div className={formStyles.actions}>
        <Link href={returnTo} className={formStyles.cancelButton}>Vazgeç</Link>
        <SubmitButton idleLabel={submitLabel} pendingLabel={pendingLabel} className={styles.primaryButton} />
      </div>
    </form>
  );
}
