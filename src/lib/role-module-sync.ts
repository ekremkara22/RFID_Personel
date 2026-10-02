export function membershipModuleRows(membershipIds: number[], moduleKeys: string[]) {
  return membershipIds.flatMap((membershipId) =>
    moduleKeys.map((moduleKey) => ({ membershipId, moduleKey })),
  );
}
