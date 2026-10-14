import { SALARY_INSURANCE_TYPE_LABELS, SALARY_INSURANCE_TYPES, WORKFORCE_TYPE_LABELS, WORKFORCE_TYPES } from "@/lib/personnel-profile";
import ui from "../management.module.css";

type Option = { id: number; name: string; isActive: boolean };

/**
 * Position, collar type and (for accounting users) salary fields shared by the create and edit forms.
 * Salary inputs are rendered only when the viewer may change them; the action ignores them otherwise.
 */
export function EmployeeRoleFields({ positions, positionId, workforceType, salary }: {
  positions: Option[];
  positionId?: number | null;
  workforceType?: string | null;
  salary: null | { canEdit: boolean; grossSalary: number | null; insuranceType: string };
}) {
  const positionOptions = positions.filter((item) => item.isActive || item.id === positionId);
  return (
    <section className={ui.formSection}>
      <div className={ui.formSectionHeader}><h2>Görev ve ücret</h2><p>Pozisyon ve personel tipi raporlarda gruplama için kullanılır.</p></div>
      <div className={ui.formGridThree}>
        <label className={ui.formField}><span>Pozisyon</span><select name="positionId" defaultValue={positionId ?? ""}><option value="">Pozisyon seçilmedi</option>{positionOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (pasif)"}</option>)}</select></label>
        <label className={ui.formField}><span>Personel tipi</span><select name="workforceType" defaultValue={workforceType ?? ""}><option value="">Belirtilmedi</option>{WORKFORCE_TYPES.map((type) => <option key={type} value={type}>{WORKFORCE_TYPE_LABELS[type]}</option>)}</select></label>
        {salary ? (
          <>
            <input type="hidden" name="salaryFieldsIncluded" value={salary.canEdit ? "1" : ""} />
            <label className={ui.formField}><span>Aylık brüt maaş (₺)</span><input name="grossSalary" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={salary.grossSalary ?? ""} placeholder="Ör. 45000" disabled={!salary.canEdit} /></label>
            <label className={ui.formField}><span>SGK tipi</span><select name="salaryInsuranceType" defaultValue={salary.insuranceType} disabled={!salary.canEdit}>{SALARY_INSURANCE_TYPES.map((type) => <option key={type} value={type}>{SALARY_INSURANCE_TYPE_LABELS[type]}</option>)}</select></label>
          </>
        ) : null}
      </div>
      {positions.length === 0 ? <p className={ui.helpText}>Pozisyon listesi boş. Sabit Tanımlar → Pozisyonlar ekranından ekleyebilirsiniz.</p> : null}
      {salary ? <p className={ui.helpText}>{salary.canEdit ? "Maaş bilgisi yalnız muhasebe yetkisi olan kullanıcılara görünür ve bütçe raporunda kullanılır." : "Maaş bilgisini görüntüleyebilirsiniz; değiştirmek için maaş hesaplama yetkisi gerekir."}</p> : null}
    </section>
  );
}
