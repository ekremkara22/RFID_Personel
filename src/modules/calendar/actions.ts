"use server";

import { CalendarApprovalStatus, SpecialDayType, WorkDayType } from "@/generated/prisma/client";
import { assertPermission, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { saveResolvedEmployeeWorkCalendar } from "@/lib/work-calendar";
import { getString, getId, getOptionalId, getOptionalDate, getOptionalNumber, getRequiredDate, getReturnTo, redirectToReturnPath } from "@/modules/shared/action-helpers";
import { parseCalendarScope, assertCalendarScopeBelongsToCompany, buildWeekdayPayload, revalidateCalendarPaths } from "@/modules/calendar/action-helpers";

export async function createWorkCalendarTemplateAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const description = getString(formData, "description") || null;
  const validFrom = getOptionalDate(formData, "validFrom");
  const validTo = getOptionalDate(formData, "validTo");
  const isDefault = formData.get("isDefault") === "on";
  const weekdays = buildWeekdayPayload(formData);

  if (!code || !name) {
    throw new Error("Takvim sablon kodu ve adi zorunludur.");
  }

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.workCalendarTemplate.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await tx.workCalendarTemplate.create({
      data: {
        code,
        name,
        description,
        validFrom,
        validTo,
        isDefault,
        companyId,
        weekdays: { create: weekdays },
      },
    });

    await tx.calendarChangeLog.create({
      data: {
        companyId,
        recordType: "TEMPLATE",
        recordId: template.id,
        newValue: JSON.stringify({ code, name, isDefault }),
        changeReason: "Takvim sablonu olusturuldu",
        changedById: user.id,
      },
    });
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/templates");
}

export async function updateWorkCalendarTemplateAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const templateId = getId(formData, "templateId");
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const description = getString(formData, "description") || null;
  const validFrom = getOptionalDate(formData, "validFrom");
  const validTo = getOptionalDate(formData, "validTo");
  const isDefault = formData.get("isDefault") === "on";
  const isActive = formData.get("isActive") === "on";
  const weekdays = buildWeekdayPayload(formData);

  if (!templateId || !code || !name) {
    throw new Error("Takvim sablon bilgileri eksik.");
  }

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.workCalendarTemplate.updateMany({
        where: { companyId, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      });
    }

    await tx.workCalendarTemplate.updateMany({
      where: { id: templateId, companyId },
      data: { code, name, description, validFrom, validTo, isDefault, isActive },
    });

    for (const weekday of weekdays) {
      await tx.workCalendarWeekday.upsert({
        where: {
          calendarTemplateId_weekday: {
            calendarTemplateId: templateId,
            weekday: weekday.weekday,
          },
        },
        update: weekday,
        create: { ...weekday, calendarTemplateId: templateId },
      });
    }

    await tx.calendarChangeLog.create({
      data: {
        companyId,
        recordType: "TEMPLATE",
        recordId: templateId,
        newValue: JSON.stringify({ code, name, isDefault, isActive }),
        changeReason: getString(formData, "changeReason") || "Takvim sablonu guncellendi",
        changedById: user.id,
      },
    });
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteWorkCalendarTemplateAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const templateId = getId(formData, "templateId");

  if (!templateId) {
    throw new Error("Takvim sablon bilgisi eksik.");
  }

  await prisma.workCalendarTemplate.deleteMany({
    where: { id: templateId, companyId },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "TEMPLATE",
      recordId: templateId,
      changeReason: "Takvim sablonu silindi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/templates");
}

export async function createCalendarSpecialDayAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const name = getString(formData, "name");
  const specialDayType = getString(formData, "specialDayType") as SpecialDayType;
  const dateFrom = getRequiredDate(formData, "dateFrom");
  const dateTo = getRequiredDate(formData, "dateTo");
  const scope = parseCalendarScope(formData);

  if (!name || !Object.values(SpecialDayType).includes(specialDayType)) {
    throw new Error("Ozel gun bilgileri gecersiz.");
  }

  const record = await prisma.calendarSpecialDay.create({
    data: {
      name,
      specialDayType,
      dateFrom,
      dateTo,
      isHalfDay: formData.get("isHalfDay") === "on",
      startTime: getString(formData, "startTime") || null,
      endTime: getString(formData, "endTime") || null,
      breakMinutes: getOptionalNumber(formData, "breakMinutes") ?? 0,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      description: getString(formData, "description") || null,
      repeatsYearly: formData.get("repeatsYearly") === "on",
      companyId,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "SPECIAL_DAY",
      recordId: record.id,
      newValue: JSON.stringify({ name, specialDayType, dateFrom, dateTo, scope }),
      changeReason: "Takvim ozel gunu olusturuldu",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCalendarSpecialDayAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const specialDayId = getId(formData, "specialDayId");
  const name = getString(formData, "name");
  const specialDayType = getString(formData, "specialDayType") as SpecialDayType;
  const scope = parseCalendarScope(formData);

  if (!specialDayId || !name || !Object.values(SpecialDayType).includes(specialDayType)) {
    throw new Error("Ozel gun bilgileri gecersiz.");
  }

  await prisma.calendarSpecialDay.updateMany({
    where: { id: specialDayId, companyId },
    data: {
      name,
      specialDayType,
      dateFrom: getRequiredDate(formData, "dateFrom"),
      dateTo: getRequiredDate(formData, "dateTo"),
      isHalfDay: formData.get("isHalfDay") === "on",
      startTime: getString(formData, "startTime") || null,
      endTime: getString(formData, "endTime") || null,
      breakMinutes: getOptionalNumber(formData, "breakMinutes") ?? 0,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      description: getString(formData, "description") || null,
      repeatsYearly: formData.get("repeatsYearly") === "on",
      isActive: formData.get("isActive") === "on",
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "SPECIAL_DAY",
      recordId: specialDayId,
      newValue: JSON.stringify({ name, specialDayType, scope }),
      changeReason: getString(formData, "changeReason") || "Takvim ozel gunu guncellendi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteCalendarSpecialDayAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const specialDayId = getId(formData, "specialDayId");

  if (!specialDayId) {
    throw new Error("Takvim kaydi eksik.");
  }

  await prisma.calendarSpecialDay.deleteMany({
    where: {
      id: specialDayId,
      companyId,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "SPECIAL_DAY",
      recordId: specialDayId,
      changeReason: "Takvim ozel gunu silindi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/special-days");
}

export async function createCalendarAssignmentAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const calendarTemplateId = getId(formData, "calendarTemplateId");
  const scope = parseCalendarScope(formData);
  const validFrom = getRequiredDate(formData, "validFrom");
  const validTo = getOptionalDate(formData, "validTo");
  const priority = getOptionalNumber(formData, "priority") ?? 100;
  const conflictReason = getString(formData, "conflictReason") || null;
  const conflictApproved = formData.get("conflictApproved") === "on";

  if (!calendarTemplateId) {
    throw new Error("Takvim sablonu secilmelidir.");
  }

  const template = await prisma.workCalendarTemplate.findFirst({
    where: { id: calendarTemplateId, companyId },
    select: { id: true },
  });

  if (!template) {
    throw new Error("Secilen takvim sablonu firmaya ait degil.");
  }

  await assertCalendarScopeBelongsToCompany(companyId, scope);

  const conflict = await prisma.calendarAssignment.findFirst({
    where: {
      companyId,
      isActive: true,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      validFrom: { lte: validTo ?? validFrom },
      OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
    },
  });

  if (conflict && !conflictApproved && !conflictReason) {
    throw new Error("Bu kapsam ve tarih araliginda cakisan takvim atamasi var. Aciklama veya onay olmadan kaydedilemez.");
  }

  const record = await prisma.calendarAssignment.create({
    data: {
      calendarTemplateId,
      scopeType: scope.scopeType,
      companyId,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      validFrom,
      validTo,
      priority,
      description: getString(formData, "description") || null,
      conflictApproved,
      conflictReason,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "ASSIGNMENT",
      recordId: record.id,
      newValue: JSON.stringify({ calendarTemplateId, scope, validFrom, validTo, priority }),
      changeReason: "Takvim atamasi olusturuldu",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCalendarAssignmentAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const assignmentId = getId(formData, "assignmentId");
  const calendarTemplateId = getId(formData, "calendarTemplateId");
  const scope = parseCalendarScope(formData);
  const priority = getOptionalNumber(formData, "priority") ?? 100;

  if (!assignmentId || !calendarTemplateId) {
    throw new Error("Takvim atama bilgileri eksik.");
  }

  const template = await prisma.workCalendarTemplate.findFirst({
    where: { id: calendarTemplateId, companyId },
    select: { id: true },
  });

  if (!template) {
    throw new Error("Secilen takvim sablonu firmaya ait degil.");
  }

  await assertCalendarScopeBelongsToCompany(companyId, scope);

  await prisma.calendarAssignment.updateMany({
    where: { id: assignmentId, companyId },
    data: {
      calendarTemplateId,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      validFrom: getRequiredDate(formData, "validFrom"),
      validTo: getOptionalDate(formData, "validTo"),
      priority,
      isActive: formData.get("isActive") === "on",
      description: getString(formData, "description") || null,
      conflictApproved: formData.get("conflictApproved") === "on",
      conflictReason: getString(formData, "conflictReason") || null,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "ASSIGNMENT",
      recordId: assignmentId,
      newValue: JSON.stringify({ calendarTemplateId, scope, priority }),
      changeReason: getString(formData, "changeReason") || "Takvim atamasi guncellendi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteCalendarAssignmentAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const assignmentId = getId(formData, "assignmentId");

  if (!assignmentId) {
    throw new Error("Takvim atama bilgisi eksik.");
  }

  await prisma.calendarAssignment.deleteMany({
    where: { id: assignmentId, companyId },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "ASSIGNMENT",
      recordId: assignmentId,
      changeReason: "Takvim atamasi silindi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/assignments");
}

export async function createCalendarDailyExceptionAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const scope = parseCalendarScope(formData);
  const newDayType = getString(formData, "newDayType") as WorkDayType;
  const changeReason = getString(formData, "changeReason");

  if (!changeReason || !Object.values(WorkDayType).includes(newDayType)) {
    throw new Error("Gunluk istisna bilgileri eksik.");
  }

  const record = await prisma.calendarDailyException.create({
    data: {
      workDate: getRequiredDate(formData, "workDate"),
      scopeType: scope.scopeType,
      companyId,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      originalDayType: (getString(formData, "originalDayType") as WorkDayType) || null,
      newDayType,
      newStartTime: getString(formData, "newStartTime") || null,
      newEndTime: getString(formData, "newEndTime") || null,
      newBreakMinutes: getOptionalNumber(formData, "newBreakMinutes"),
      changeReason,
      approvalStatus: (getString(formData, "approvalStatus") as CalendarApprovalStatus) || CalendarApprovalStatus.APPROVED,
      createdById: user.id,
      approvedById: user.id,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "DAILY_EXCEPTION",
      recordId: record.id,
      newValue: JSON.stringify({ scope, newDayType }),
      changeReason,
      changedById: user.id,
      approvedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCalendarDailyExceptionAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const exceptionId = getId(formData, "exceptionId");
  const newDayType = getString(formData, "newDayType") as WorkDayType;
  const changeReason = getString(formData, "changeReason");

  if (!exceptionId || !changeReason || !Object.values(WorkDayType).includes(newDayType)) {
    throw new Error("Gunluk istisna bilgileri eksik.");
  }

  await prisma.calendarDailyException.updateMany({
    where: { id: exceptionId, companyId },
    data: {
      newDayType,
      newStartTime: getString(formData, "newStartTime") || null,
      newEndTime: getString(formData, "newEndTime") || null,
      newBreakMinutes: getOptionalNumber(formData, "newBreakMinutes"),
      changeReason,
      approvalStatus: (getString(formData, "approvalStatus") as CalendarApprovalStatus) || CalendarApprovalStatus.APPROVED,
      approvedById: user.id,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "DAILY_EXCEPTION",
      recordId: exceptionId,
      newValue: JSON.stringify({ newDayType }),
      changeReason,
      changedById: user.id,
      approvedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function generateEmployeeDailyCalendarAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const fromDate = getRequiredDate(formData, "fromDate");
  const toDate = getRequiredDate(formData, "toDate");
  const employeeId = getOptionalId(formData, "employeeId");
  const department = getString(formData, "department");

  const employees = await prisma.employee.findMany({
    where: {
      ...employeeScopeWhere(authorization),
      ...(employeeId ? { id: employeeId } : {}),
      ...(department ? { department } : {}),
    },
    select: { id: true },
  });

  const current = new Date(fromDate);
  const end = new Date(toDate);
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (current > end) {
    throw new Error("Baslangic tarihi bitis tarihinden sonra olamaz.");
  }

  let generatedCount = 0;
  while (current <= end) {
    for (const employee of employees) {
      await saveResolvedEmployeeWorkCalendar(employee.id, current);
      generatedCount += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "EMPLOYEE_DAILY_CALENDAR",
      recordId: companyId,
      newValue: JSON.stringify({ fromDate, toDate, employeeId, department, generatedCount }),
      changeReason: "Personel gunluk takvimleri uretildi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}
