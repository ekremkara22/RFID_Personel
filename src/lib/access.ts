import { prisma } from "@/lib/prisma";

export async function getAccessibleCompanyIds(user: {
  id: string;
  role: string;
  companyId: string | null;
}) {
  if (user.role === "SUPERADMIN") {
    return null;
  }

  const accessRows = await prisma.userCompanyAccess.findMany({
    where: { userId: user.id },
    select: { companyId: true },
  });
  const companyIds = new Set(accessRows.map((row) => row.companyId));

  if (user.companyId) {
    companyIds.add(user.companyId);
  }

  return Array.from(companyIds);
}

export function scopedCompanyFilter(companyIds: string[] | null) {
  return companyIds === null ? {} : { companyId: { in: companyIds } };
}
