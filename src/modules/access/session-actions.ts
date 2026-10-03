"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CompanyMembershipStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVE_COMPANY_COOKIE_NAME, requireSessionUser } from "@/lib/session";
import { value } from "@/modules/access/action-helpers";

export async function setActiveCompanyAction(formData: FormData) {
  return runFormAction(() => setActiveCompanyActionImpl(formData));
}

async function setActiveCompanyActionImpl(formData: FormData) {
  const { user } = await requireSessionUser();
  const companyId = Number(value(formData, "companyId"));
  const membership = await prisma.companyMembership.findFirst({ where: { userId: user.id, companyId, status: CompanyMembershipStatus.ACTIVE, company: { isActive: true }, role: { isActive: true } }, select: { id: true } });
  if (!membership && user.role !== Role.SUPERADMIN) throw new ActionError("Bu firmaya erişiminiz yok.");
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE_NAME, String(companyId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}
