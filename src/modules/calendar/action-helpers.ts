import { revalidatePath } from "next/cache";
import { CalendarScopeType, WorkDayType } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { calculateGrossMinutes, calculateNetMinutes } from "@/lib/work-calendar-rules";
import { getOptionalId, getOptionalNumber, getString } from "@/modules/shared/action-helpers";

export function parseCalendarScope(formData: FormData) {
  const scopeType = getString(formData, "scopeType") as CalendarScopeType;
  if (!new Set<string>(Object.values(CalendarScopeType)).has(scopeType)) throw new ActionError("Takvim kapsami gecersiz.");
  return {
    scopeType,
    branchId: scopeType === CalendarScopeType.BRANCH ? getOptionalId(formData, "branchId") : null,
    departmentId: scopeType === CalendarScopeType.DEPARTMENT ? getOptionalId(formData, "departmentId") : null,
    employeeId: scopeType === CalendarScopeType.EMPLOYEE ? getOptionalId(formData, "employeeId") : null,
  };
}

export async function assertCalendarScopeBelongsToCompany(companyId: number, scope: ReturnType<typeof parseCalendarScope>) {
  if (scope.branchId && !await prisma.branch.findFirst({ where: { id: scope.branchId, companyId }, select: { id: true } })) {
    throw new ActionError("Secilen sube firmaya ait degil.");
  }
  if (scope.departmentId && !await prisma.department.findFirst({ where: { id: scope.departmentId, companyId }, select: { id: true } })) {
    throw new ActionError("Secilen departman firmaya ait degil.");
  }
  if (scope.employeeId && !await prisma.employee.findFirst({ where: { id: scope.employeeId, companyId }, select: { id: true } })) {
    throw new ActionError("Secilen personel firmaya ait degil.");
  }
}

export function buildWeekdayPayload(formData: FormData) {
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = index + 1;
    const dayType = getString(formData, `weekday-${weekday}-dayType`) as WorkDayType;
    const startTime = getString(formData, `weekday-${weekday}-startTime`) || null;
    const endTime = getString(formData, `weekday-${weekday}-endTime`) || null;
    const breakStartTime = getString(formData, `weekday-${weekday}-breakStartTime`) || null;
    const breakEndTime = getString(formData, `weekday-${weekday}-breakEndTime`) || null;
    const crossesMidnight = formData.get(`weekday-${weekday}-crossesMidnight`) === "on";
    const breakMinutes = getOptionalNumber(formData, `weekday-${weekday}-breakMinutes`) ?? 0;
    return {
      weekday,
      dayType: Object.values(WorkDayType).includes(dayType) ? dayType : WorkDayType.NON_WORKING,
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
      crossesMidnight,
      breakMinutes,
      plannedGrossMinutes: calculateGrossMinutes(startTime, endTime, crossesMidnight),
      plannedNetMinutes: calculateNetMinutes(startTime, endTime, breakMinutes, crossesMidnight),
      checkLateArrival: formData.get(`weekday-${weekday}-checkLateArrival`) === "on",
      checkEarlyDeparture: formData.get(`weekday-${weekday}-checkEarlyDeparture`) === "on",
      checkAbsence: formData.get(`weekday-${weekday}-checkAbsence`) === "on",
    };
  });
}

export function revalidateCalendarPaths() {
  for (const path of [
    "/dashboard", "/dashboard/calendar", "/dashboard/calendar/templates", "/dashboard/calendar/official-holidays",
    "/dashboard/calendar/special-days", "/dashboard/calendar/assignments", "/dashboard/calendar/exceptions",
    "/dashboard/calendar/conflicts", "/dashboard/calendar/change-logs", "/dashboard/reports",
  ]) revalidatePath(path);
}
