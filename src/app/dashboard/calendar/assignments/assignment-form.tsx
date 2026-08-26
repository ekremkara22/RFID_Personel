"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/app/dashboard/submit-button";
import styles from "../../../page.module.css";

const calendarScopeTypes = ["COMPANY", "BRANCH", "DEPARTMENT", "EMPLOYEE"] as const;
type CalendarScopeType = (typeof calendarScopeTypes)[number];

const scopeLabels: Record<CalendarScopeType, string> = {
  COMPANY: "Sirket",
  BRANCH: "Sube",
  DEPARTMENT: "Departman",
  EMPLOYEE: "Personel",
};

type CompanyOption = {
  id: string;
  name: string;
};

type TemplateOption = {
  id: string;
  name: string;
  companyId: string;
};

type BranchOption = {
  id: string;
  name: string;
  companyId: string;
};

type DepartmentOption = {
  id: string;
  name: string;
  companyId: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  companyId: string;
};

type AssignmentFormValues = {
  assignmentId?: string;
  companyId?: string;
  calendarTemplateId?: string;
  scopeType?: CalendarScopeType;
  branchId?: string | null;
  departmentId?: string | null;
  employeeId?: string | null;
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
  const initialCompanyId = values?.companyId || companies[0]?.id || "";
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
    <form action={action} className={styles.formGrid}>
      <input type="hidden" name="returnTo" value={returnTo} />
      {values?.assignmentId ? <input type="hidden" name="assignmentId" value={values.assignmentId} /> : null}

      {lockCompany ? (
        <label className={styles.field}>
          <span>Firma</span>
          <input value={selectedCompanyName} readOnly />
          <input type="hidden" name="companyId" value={companyId} />
        </label>
      ) : (
        <label className={styles.field}>
          <span>Firma</span>
          <select name="companyId" required value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="" disabled>Firma sec</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className={styles.field}>
        <span>Takvim Sablonu</span>
        <select name="calendarTemplateId" required defaultValue={values?.calendarTemplateId ?? ""} key={companyId}>
          <option value="" disabled>Sablon sec</option>
          {filteredTemplates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Kapsam</span>
        <select
          name="scopeType"
          value={scopeType}
          onChange={(event) => setScopeType(event.target.value as CalendarScopeType)}
        >
          {calendarScopeTypes.map((scope) => (
            <option key={scope} value={scope}>{scopeLabels[scope]}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Sube</span>
        <select
          name="branchId"
          defaultValue={values?.branchId ?? ""}
          disabled={scopeType !== "BRANCH"}
          key={`${companyId}-branch-${scopeType}`}
        >
          <option value="">Secilmedi</option>
          {filteredBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Departman</span>
        <select
          name="departmentId"
          defaultValue={values?.departmentId ?? ""}
          disabled={scopeType !== "DEPARTMENT"}
          key={`${companyId}-department-${scopeType}`}
        >
          <option value="">Secilmedi</option>
          {filteredDepartments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Personel</span>
        <select
          name="employeeId"
          defaultValue={values?.employeeId ?? ""}
          disabled={scopeType !== "EMPLOYEE"}
          key={`${companyId}-employee-${scopeType}`}
        >
          <option value="">Secilmedi</option>
          {filteredEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Baslangic</span>
        <input name="validFrom" type="date" required defaultValue={values?.validFrom ?? ""} />
      </label>

      <label className={styles.field}>
        <span>Bitis</span>
        <input name="validTo" type="date" defaultValue={values?.validTo ?? ""} />
      </label>

      <label className={styles.field}>
        <span>Oncelik</span>
        <input name="priority" type="number" defaultValue={values?.priority ?? 100} />
      </label>

      <label className={`${styles.field} ${styles.fullWidth}`}>
        <span>Aciklama</span>
        <textarea name="description" defaultValue={values?.description ?? ""} />
      </label>

      <label className={`${styles.field} ${styles.fullWidth}`}>
        <span>Cakisma Onay Aciklamasi</span>
        <input name="conflictReason" defaultValue={values?.conflictReason ?? ""} placeholder="Cakisan atama varsa nedenini yazin" />
      </label>

      <label className={styles.checkField}>
        <input name="conflictApproved" type="checkbox" defaultChecked={values?.conflictApproved ?? false} />
        <span>Cakismayi onaylayarak kaydet</span>
      </label>

      {typeof values?.isActive === "boolean" ? (
        <label className={styles.checkField}>
          <input name="isActive" type="checkbox" defaultChecked={values.isActive} />
          <span>Aktif</span>
        </label>
      ) : null}

      {values?.assignmentId ? (
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Degisiklik Nedeni</span>
          <input name="changeReason" />
        </label>
      ) : null}

      <div className={styles.fullWidthActionRow}>
        <SubmitButton idleLabel={submitLabel} pendingLabel={pendingLabel} className={styles.primaryButton} />
      </div>
    </form>
  );
}
