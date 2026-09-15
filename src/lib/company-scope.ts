// null is reserved for superadmins; an empty list must never remove the filter.
export function scopedCompanyFilter(companyIds: number[] | null) {
  return companyIds === null ? {} : { companyId: { in: companyIds } };
}
