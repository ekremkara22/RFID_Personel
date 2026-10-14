import Link from "next/link";
import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import type { ActionResult } from "@/lib/action-error";
import { SALARY_BASES, SALARY_BASIS_LABELS, SALARY_INSURANCE_TYPE_LABELS, SALARY_INSURANCE_TYPES } from "@/lib/personnel-profile";
import type { AccountingPersonnelRecord } from "@/modules/accounting/repository";
import ui from "../../../management.module.css";

type Option = { id: number; name: string; isActive: boolean };

function DefinitionSelect({ name, label, options, value, emptyHref }: { name: string; label: string; options: Option[]; value: number | null; emptyHref: string }) {
  const visible = options.filter((item) => item.isActive || item.id === value);
  return (
    <label className={ui.formField}>
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ""} required>
        <option value="" disabled>{label} seçin</option>
        {visible.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (pasif)"}</option>)}
      </select>
      {visible.length === 0 ? <small className={ui.helpText}>Tanım yok. <Link href={emptyHref}>Sabit Tanımlar ekranından ekleyin.</Link></small> : null}
    </label>
  );
}

/** Create/edit form for Muhasebe personnel; every select reads Muhasebe's own definitions. */
export function AccountingPersonnelForm({ action, options, record, canEdit, submitLabel }: {
  action: (data: FormData) => Promise<ActionResult | void>;
  options: { departments: Option[]; positions: Option[]; collarTypes: Option[] };
  record?: AccountingPersonnelRecord;
  canEdit: boolean;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className={ui.formShell}>
      {record ? <input type="hidden" name="id" value={record.id} /> : null}
      <fieldset disabled={!canEdit} className={ui.formShell}>
        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Kimlik</h2><p>Muhasebe personeli İK personel kayıtlarından bağımsızdır.</p></div>
          <div className={ui.formGridThree}>
            <label className={ui.formField}><span>Ad</span><input name="firstName" defaultValue={record?.firstName} required maxLength={100} /></label>
            <label className={ui.formField}><span>Soyad</span><input name="lastName" defaultValue={record?.lastName} required maxLength={100} /></label>
            <label className={ui.formField}><span>Sicil numarası</span><input name="registrationNumber" defaultValue={record?.registrationNumber ?? ""} maxLength={64} placeholder="İsteğe bağlı" /></label>
          </div>
        </section>
        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Görev</h2><p>Departman, pozisyon ve yaka tipi bütçe raporunda gruplama için zorunludur.</p></div>
          <div className={ui.formGridThree}>
            <DefinitionSelect name="departmentId" label="Departman" options={options.departments} value={record?.departmentId ?? null} emptyHref="/dashboard/accounting/definitions/departments" />
            <DefinitionSelect name="positionId" label="Pozisyon" options={options.positions} value={record?.positionId ?? null} emptyHref="/dashboard/accounting/definitions/positions" />
            <DefinitionSelect name="collarTypeId" label="Yaka tipi" options={options.collarTypes} value={record?.collarTypeId ?? null} emptyHref="/dashboard/accounting/definitions/collar-types" />
          </div>
        </section>
        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Ücret</h2><p>Brüt maaşlı personel Brütten Nete, net maaşlı personel Netten Brüte ekranında &quot;Personel tanımlarından aktar&quot; ile kullanılır.</p></div>
          <div className={ui.formGridThree}>
            <label className={ui.formField}><span>Maaş tipi</span><select name="salaryBasis" defaultValue={record?.salaryBasis ?? "GROSS"} required>{SALARY_BASES.map((basis) => <option key={basis} value={basis}>{SALARY_BASIS_LABELS[basis]} maaş</option>)}</select></label>
            <label className={ui.formField}><span>Aylık maaş (₺)</span><input name="salaryAmount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={record?.salaryAmount ?? ""} placeholder="Ör. 45000" /></label>
            <label className={ui.formField}><span>Çalışan tipi</span><select name="insuranceType" defaultValue={record?.insuranceType ?? "INCENTIVE"}>{SALARY_INSURANCE_TYPES.map((type) => <option key={type} value={type}>{SALARY_INSURANCE_TYPE_LABELS[type]}</option>)}</select></label>
            <label className={ui.formField}><span>İşe giriş tarihi</span><input name="hireDate" type="date" defaultValue={record?.hireDate ?? ""} /></label>
            {record ? <label className={ui.checkField}><input name="isActive" type="checkbox" defaultChecked={record.isActive} />Personel aktif</label> : null}
          </div>
        </section>
      </fieldset>
      {canEdit ? <div className={ui.formActions}><SubmitButton idleLabel={submitLabel} pendingLabel="Kaydediliyor..." className={ui.primaryAction} /></div> : <p className={ui.helpText}>Personel bilgilerini değiştirmek için maaş hesaplama yetkisi gerekir.</p>}
    </ActionForm>
  );
}
