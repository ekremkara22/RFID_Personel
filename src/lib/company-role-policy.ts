export function canDeleteCompanyRole(membershipCount: number) {
  return membershipCount === 0;
}

export function companyRoleDeletionMessage(membershipCount: number) {
  return canDeleteCompanyRole(membershipCount)
    ? null
    : `Bu rol ${membershipCount} kullanıcı tarafından kullanıldığı için silinemez.`;
}
