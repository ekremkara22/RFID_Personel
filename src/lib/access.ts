import { prisma } from "@/lib/prisma";
export { scopedCompanyFilter } from "./company-scope";

export async function getAccessibleCompanyIds(user: {
  id: number;
  role: string;
  companyId: number | null;
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
