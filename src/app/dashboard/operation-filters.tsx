"use client";

import { useMemo, useState } from "react";

type CompanyOption = { id: number; name: string };
type ScopeOption = { companyId: number; branch: string | null; department: string };

export function OperationFilters(props: {
  todayKey: string;
  selectedDate: string;
  selectedCompanyId: string;
  selectedBranch: string;
  selectedDepartment: string;
  companies: CompanyOption[];
  scopes: ScopeOption[];
  className: string;
}) {
  const [companyId, setCompanyId] = useState(props.selectedCompanyId);
  const [branch, setBranch] = useState(props.selectedBranch);
  const [department, setDepartment] = useState(props.selectedDepartment);
  const numericCompanyId = Number(companyId);

  const availableScopes = useMemo(
    () => props.scopes.filter((scope) => !companyId || scope.companyId === numericCompanyId),
    [companyId, numericCompanyId, props.scopes],
  );
  const branches = [...new Set(availableScopes.map((scope) => scope.branch).filter(Boolean) as string[])].sort();
  const departments = [...new Set(
    availableScopes
      .filter((scope) => !branch || scope.branch === branch)
      .map((scope) => scope.department)
      .filter(Boolean),
  )].sort();

  return (
    <form className={props.className}>
      <label><span>Tarih</span><input name="date" type="date" max={props.todayKey} defaultValue={props.selectedDate} /></label>
      <label>
        <span>Firma</span>
        <select
          name="companyId"
          value={companyId}
          onChange={(event) => { setCompanyId(event.target.value); setBranch(""); setDepartment(""); }}
        >
          <option value="">Tümü</option>
          {props.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      <label>
        <span>Şube</span>
        <select name="branch" value={branch} onChange={(event) => { setBranch(event.target.value); setDepartment(""); }}>
          <option value="">Tümü</option>
          {branches.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>Departman</span>
        <select name="department" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">Tümü</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <button type="submit">Göster</button>
    </form>
  );
}
