import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";
import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const ACTIVE_COMPANY_COOKIE_NAME = "rfid_active_company";

export async function requireSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await verifyToken(token);

  if (!session) {
    redirect("/login");
  }

  if (!Number.isSafeInteger(session.id) || session.id <= 0) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      company: true,
      companyAccess: {
        include: { company: true },
      },
      memberships: {
        where: { status: "ACTIVE", company: { isActive: true }, role: { isActive: true } },
        include: { company: true, role: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const requestedCompanyId = Number(cookieStore.get(ACTIVE_COMPANY_COOKIE_NAME)?.value);
  const preferredCompanyId = Number.isSafeInteger(requestedCompanyId) && requestedCompanyId > 0 ? requestedCompanyId : user.companyId;
  const authorization = await getAuthorizationContext(user, preferredCompanyId);

  if (user.role !== "SUPERADMIN" && !authorization.companyId && authorization.modules.size === 0) redirect("/login");
  if (authorization.companyId) {
    const activeMembership = user.memberships.find((item) => item.companyId === authorization.companyId);
    user.companyId = authorization.companyId;
    user.company = activeMembership?.company ?? user.company;
  }

  return {
    session,
    user,
    authorization,
    memberships: user.memberships.map((item) => ({ companyId: item.companyId, companyName: item.company.name, roleName: item.role.name })),
  };
}
