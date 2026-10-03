"use server";

import { revalidatePath } from "next/cache";
import { DataScopeMode, PayrollPeriodStatus } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { buildPayrollSnapshot, getDefaultPayrollMonth, getPayrollMonthRange, PAYROLL_MONTH_PATTERN } from "@/lib/payroll-period";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, redirectToReturnPath } from "@/modules/shared/action-helpers";

export async function approvePayrollPeriodAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PAYROLL_APPROVE);
  const companyId = getId(formData, "companyId");
  const monthKey = getString(formData, "month");
  const approvalNote = getString(formData, "approvalNote") || null;
  if (!PAYROLL_MONTH_PATTERN.test(monthKey)) throw new Error("Puantaj donemi gecersiz.");
  if (monthKey > getDefaultPayrollMonth()) throw new Error("Gelecek donem onaylanamaz.");
  if (authorization.companyId !== companyId) throw new Error("Bu firma icin yetkiniz yok.");
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== DataScopeMode.COMPANY) throw new Error("Puantaj dönemi yalnız firma genelinde yetkili kullanıcı tarafından onaylanabilir.");
  const { year, month } = getPayrollMonthRange(monthKey);
  const current = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (current?.status === PayrollPeriodStatus.LOCKED) throw new Error("Kilitli puantaj donemi degistirilemez.");

  const snapshot = await buildPayrollSnapshot(companyId, monthKey);
  await prisma.payrollPeriod.upsert({
    where: { companyId_year_month: { companyId, year, month } },
    create: {
      companyId,
      year,
      month,
      status: PayrollPeriodStatus.APPROVED,
      snapshotJson: JSON.stringify(snapshot),
      snapshotCreatedAt: new Date(),
      approvalNote,
      approvedById: user.id,
      approvedAt: new Date(),
    },
    update: {
      status: PayrollPeriodStatus.APPROVED,
      snapshotJson: JSON.stringify(snapshot),
      snapshotCreatedAt: new Date(),
      approvalNote,
      approvedById: user.id,
      approvedAt: new Date(),
      lockedById: null,
      lockedAt: null,
    },
  });
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, `/dashboard/reports/payroll?month=${monthKey}&companyId=${companyId}`);
}

export async function reopenPayrollPeriodAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PAYROLL_APPROVE);
  const companyId = getId(formData, "companyId");
  const monthKey = getString(formData, "month");
  if (!PAYROLL_MONTH_PATTERN.test(monthKey)) throw new Error("Puantaj donemi gecersiz.");
  if (monthKey > getDefaultPayrollMonth()) throw new Error("Gelecek donem acilamaz.");
  if (authorization.companyId !== companyId) throw new Error("Bu firma icin yetkiniz yok.");
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== DataScopeMode.COMPANY) throw new Error("Puantaj dönemi yalnız firma genelinde yetkili kullanıcı tarafından yeniden açılabilir.");
  const { year, month } = getPayrollMonthRange(monthKey);
  const period = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (!period || period.status !== PayrollPeriodStatus.APPROVED) {
    throw new Error("Yalnizca onayli ve henuz kilitlenmemis donem yeniden acilabilir.");
  }
  await prisma.payrollPeriod.update({
    where: { id: period.id },
    data: {
      status: PayrollPeriodStatus.OPEN,
      snapshotJson: null,
      snapshotCreatedAt: null,
      approvedById: null,
      approvedAt: null,
      approvalNote: null,
    },
  });
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, `/dashboard/reports/payroll?month=${monthKey}&companyId=${companyId}`);
}

export async function lockPayrollPeriodAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PAYROLL_APPROVE);
  const companyId = getId(formData, "companyId");
  const monthKey = getString(formData, "month");
  if (!PAYROLL_MONTH_PATTERN.test(monthKey)) throw new Error("Puantaj donemi gecersiz.");
  if (monthKey > getDefaultPayrollMonth()) throw new Error("Gelecek donem kilitlenemez.");
  if (authorization.companyId !== companyId) throw new Error("Bu firma icin yetkiniz yok.");
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== DataScopeMode.COMPANY) throw new Error("Puantaj dönemi yalnız firma genelinde yetkili kullanıcı tarafından kilitlenebilir.");
  const { year, month } = getPayrollMonthRange(monthKey);
  const period = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (!period || period.status !== PayrollPeriodStatus.APPROVED || !period.snapshotJson) {
    throw new Error("Donem kilitlenmeden once onaylanmalidir.");
  }
  await prisma.payrollPeriod.update({
    where: { id: period.id },
    data: { status: PayrollPeriodStatus.LOCKED, lockedById: user.id, lockedAt: new Date() },
  });
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, `/dashboard/reports/payroll?month=${monthKey}&companyId=${companyId}`);
}
