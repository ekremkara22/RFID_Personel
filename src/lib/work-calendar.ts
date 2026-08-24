import {
  CalendarApprovalStatus,
  CalendarCalculationStatus,
  CalendarScopeType,
  EmploymentStatus,
  LeaveApprovalStatus,
  LeaveDurationType,
  SpecialDayType,
  WorkDayType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateGrossMinutes,
  calculateNetMinutes,
  isDateWithinRange,
  resolveEmploymentStatus,
  startOfLocalDay,
} from "@/lib/work-calendar-rules";

const nonWorkingSpecialTypes = new Set<SpecialDayType>([
  SpecialDayType.OFFICIAL_HOLIDAY,
  SpecialDayType.COMPANY_HOLIDAY,
  SpecialDayType.ADMINISTRATIVE_HOLIDAY,
  SpecialDayType.DEPARTMENT_HOLIDAY,
  SpecialDayType.BRANCH_HOLIDAY,
]);

const workingSpecialTypes = new Set<SpecialDayType>([
  SpecialDayType.HALF_WORK,
  SpecialDayType.EXTRA_WORK,
  SpecialDayType.DEPARTMENT_WORK,
  SpecialDayType.BRANCH_WORK,
]);

function toDateOnly(value: Date) {
  return startOfLocalDay(value);
}

function nextDateOnly(value: Date) {
  const date = toDateOnly(value);
  date.setDate(date.getDate() + 1);
  return date;
}

function getPrismaWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function scopeMatchesEmployee(
  item: {
    scopeType: CalendarScopeType;
    branch?: { name: string } | null;
    department?: { name: string } | null;
    employeeId?: string | null;
  },
  employee: { id: string; branch: string | null; department: string },
) {
  if (item.scopeType === CalendarScopeType.EMPLOYEE) return item.employeeId === employee.id;
  if (item.scopeType === CalendarScopeType.DEPARTMENT) return item.department?.name === employee.department;
  if (item.scopeType === CalendarScopeType.BRANCH) return item.branch?.name === employee.branch;
  return true;
}

function getScopeWeight(scopeType: CalendarScopeType) {
  if (scopeType === CalendarScopeType.EMPLOYEE) return 4;
  if (scopeType === CalendarScopeType.DEPARTMENT) return 3;
  if (scopeType === CalendarScopeType.BRANCH) return 2;
  return 1;
}

function createClosedResult(
  employeeId: string,
  workDate: Date,
  employmentStatus: EmploymentStatus,
  reason: string,
) {
  return {
    employeeId,
    workDate,
    employmentStatus,
    dayType: WorkDayType.NON_WORKING,
    plannedStart: null,
    plannedEnd: null,
    crossesMidnight: false,
    plannedBreakMinutes: 0,
    plannedGrossMinutes: 0,
    plannedNetMinutes: 0,
    checkLateArrival: false,
    checkEarlyDeparture: false,
    checkAbsence: false,
    leaveId: null,
    calendarTemplateId: null,
    ruleSourceType: "EMPLOYMENT",
    ruleSourceId: null,
    calculationStatus: CalendarCalculationStatus.OUT_OF_EMPLOYMENT,
    calculationReason: reason,
  };
}

export async function resolveEmployeeWorkCalendar(employeeId: string, workDateInput: Date) {
  const workDate = toDateOnly(workDateInput);
  const nextDate = nextDateOnly(workDate);
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { company: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  const employmentStatus = resolveEmploymentStatus(employee, workDate) as EmploymentStatus;
  if (employmentStatus !== EmploymentStatus.ACTIVE) {
    return createClosedResult(
      employee.id,
      workDate,
      employmentStatus,
      employmentStatus === EmploymentStatus.BEFORE_HIRE
        ? "Ise giris tarihinden once"
        : employmentStatus === EmploymentStatus.AFTER_TERMINATION
          ? "Isten ayrilis tarihinden sonra"
          : "Personel pasif",
    );
  }

  const [leave, exceptions, specialDays, assignments, defaultTemplate] = await Promise.all([
    prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        companyId: employee.companyId,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lt: nextDate },
        endDate: { gte: workDate },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.calendarDailyException.findMany({
      where: {
        companyId: employee.companyId,
        approvalStatus: CalendarApprovalStatus.APPROVED,
        workDate: { gte: workDate, lt: nextDate },
      },
      include: { branch: true, department: true },
    }),
    prisma.calendarSpecialDay.findMany({
      where: {
        companyId: employee.companyId,
        isActive: true,
        dateFrom: { lt: nextDate },
        dateTo: { gte: workDate },
      },
      include: { branch: true, department: true },
    }),
    prisma.calendarAssignment.findMany({
      where: {
        companyId: employee.companyId,
        isActive: true,
        validFrom: { lte: workDate },
        OR: [{ validTo: null }, { validTo: { gte: workDate } }],
      },
      include: {
        branch: true,
        department: true,
        calendarTemplate: { include: { weekdays: true } },
      },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.workCalendarTemplate.findFirst({
      where: {
        companyId: employee.companyId,
        isDefault: true,
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: workDate } },
        ],
        AND: [
          {
            OR: [
              { validTo: null },
              { validTo: { gte: workDate } },
            ],
          },
        ],
      },
      include: { weekdays: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (leave && leave.durationType === LeaveDurationType.FULL_DAY) {
    return {
      employeeId,
      workDate,
      employmentStatus,
      dayType: WorkDayType.LEAVE,
      plannedStart: leave.startTime,
      plannedEnd: leave.endTime,
      crossesMidnight: false,
      plannedBreakMinutes: 0,
      plannedGrossMinutes: 0,
      plannedNetMinutes: 0,
      checkLateArrival: false,
      checkEarlyDeparture: false,
      checkAbsence: false,
      leaveId: leave.id,
      calendarTemplateId: null,
      ruleSourceType: "APPROVED_LEAVE",
      ruleSourceId: leave.id,
      calculationStatus: CalendarCalculationStatus.CALCULATED,
      calculationReason: "Onayli tam gun izin veya saglik raporu",
    };
  }

  const matchingExceptions = exceptions
    .filter((item) => scopeMatchesEmployee(item, employee))
    .sort((first, second) => getScopeWeight(second.scopeType) - getScopeWeight(first.scopeType));

  const bestException = matchingExceptions[0];
  if (bestException) {
    const breakMinutes = bestException.newBreakMinutes ?? 0;
    return {
      employeeId,
      workDate,
      employmentStatus,
      dayType: bestException.newDayType,
      plannedStart: bestException.newStartTime,
      plannedEnd: bestException.newEndTime,
      crossesMidnight: false,
      plannedBreakMinutes: breakMinutes,
      plannedGrossMinutes: calculateGrossMinutes(bestException.newStartTime, bestException.newEndTime),
      plannedNetMinutes: calculateNetMinutes(bestException.newStartTime, bestException.newEndTime, breakMinutes),
      checkLateArrival: bestException.newDayType === WorkDayType.NORMAL_WORK,
      checkEarlyDeparture: bestException.newDayType === WorkDayType.NORMAL_WORK,
      checkAbsence: bestException.newDayType === WorkDayType.NORMAL_WORK,
      leaveId: leave?.id ?? null,
      calendarTemplateId: null,
      ruleSourceType: `${bestException.scopeType}_DAILY_EXCEPTION`,
      ruleSourceId: bestException.id,
      calculationStatus: CalendarCalculationStatus.CALCULATED,
      calculationReason: bestException.changeReason,
    };
  }

  const matchingSpecialDay = specialDays
    .filter((item) => scopeMatchesEmployee(item, employee))
    .sort((first, second) => getScopeWeight(second.scopeType) - getScopeWeight(first.scopeType))[0];

  if (matchingSpecialDay) {
    const isWorking = workingSpecialTypes.has(matchingSpecialDay.specialDayType);
    const isOfficial = matchingSpecialDay.specialDayType === SpecialDayType.OFFICIAL_HOLIDAY;
    const dayType = isOfficial
      ? WorkDayType.OFFICIAL_HOLIDAY
      : matchingSpecialDay.isHalfDay
        ? WorkDayType.HALF_WORK
        : isWorking
          ? WorkDayType.EXTRA_WORK
          : WorkDayType.COMPANY_HOLIDAY;
    const breakMinutes = matchingSpecialDay.breakMinutes;

    return {
      employeeId,
      workDate,
      employmentStatus,
      dayType,
      plannedStart: isWorking || matchingSpecialDay.isHalfDay ? matchingSpecialDay.startTime : null,
      plannedEnd: isWorking || matchingSpecialDay.isHalfDay ? matchingSpecialDay.endTime : null,
      crossesMidnight: false,
      plannedBreakMinutes: isWorking || matchingSpecialDay.isHalfDay ? breakMinutes : 0,
      plannedGrossMinutes:
        isWorking || matchingSpecialDay.isHalfDay
          ? calculateGrossMinutes(matchingSpecialDay.startTime, matchingSpecialDay.endTime)
          : 0,
      plannedNetMinutes:
        isWorking || matchingSpecialDay.isHalfDay
          ? calculateNetMinutes(matchingSpecialDay.startTime, matchingSpecialDay.endTime, breakMinutes)
          : 0,
      checkLateArrival: isWorking || matchingSpecialDay.isHalfDay,
      checkEarlyDeparture: isWorking || matchingSpecialDay.isHalfDay,
      checkAbsence: isWorking || matchingSpecialDay.isHalfDay,
      leaveId: leave?.id ?? null,
      calendarTemplateId: null,
      ruleSourceType: nonWorkingSpecialTypes.has(matchingSpecialDay.specialDayType)
        ? "SPECIAL_NON_WORKING_DAY"
        : "SPECIAL_WORKING_DAY",
      ruleSourceId: matchingSpecialDay.id,
      calculationStatus: CalendarCalculationStatus.CALCULATED,
      calculationReason: matchingSpecialDay.name,
    };
  }

  const matchingAssignments = assignments.filter(
    (item) => scopeMatchesEmployee(item, employee) && isDateWithinRange(workDate, item.validFrom, item.validTo),
  );
  const topAssignment = matchingAssignments[0];

  if (
    topAssignment &&
    !topAssignment.conflictApproved &&
    matchingAssignments.length > 1 &&
    matchingAssignments[1].priority === topAssignment.priority &&
    matchingAssignments[1].scopeType === topAssignment.scopeType
  ) {
    return {
      employeeId,
      workDate,
      employmentStatus,
      dayType: WorkDayType.CONFLICT,
      plannedStart: null,
      plannedEnd: null,
      crossesMidnight: false,
      plannedBreakMinutes: 0,
      plannedGrossMinutes: 0,
      plannedNetMinutes: 0,
      checkLateArrival: false,
      checkEarlyDeparture: false,
      checkAbsence: false,
      leaveId: leave?.id ?? null,
      calendarTemplateId: null,
      ruleSourceType: "CALENDAR_ASSIGNMENT_CONFLICT",
      ruleSourceId: topAssignment.id,
      calculationStatus: CalendarCalculationStatus.CONFLICT,
      calculationReason: "Ayni oncelikte cakisan takvim atamasi var",
    };
  }

  const template = topAssignment?.calendarTemplate ?? defaultTemplate;
  if (!template) {
    return {
      employeeId,
      workDate,
      employmentStatus,
      dayType: WorkDayType.CONFLICT,
      plannedStart: null,
      plannedEnd: null,
      crossesMidnight: false,
      plannedBreakMinutes: 0,
      plannedGrossMinutes: 0,
      plannedNetMinutes: 0,
      checkLateArrival: false,
      checkEarlyDeparture: false,
      checkAbsence: false,
      leaveId: leave?.id ?? null,
      calendarTemplateId: null,
      ruleSourceType: "MISSING_DEFAULT_CALENDAR",
      ruleSourceId: null,
      calculationStatus: CalendarCalculationStatus.MISSING_DEFAULT,
      calculationReason: "Firma icin varsayilan takvim bulunamadi",
    };
  }

  const weekday = template.weekdays.find((item) => item.weekday === getPrismaWeekday(workDate));
  const dayType = weekday?.dayType ?? WorkDayType.NON_WORKING;
  const breakMinutes = weekday?.breakMinutes ?? 0;

  return {
    employeeId,
    workDate,
    employmentStatus,
    dayType,
    plannedStart: weekday?.startTime ?? null,
    plannedEnd: weekday?.endTime ?? null,
    crossesMidnight: weekday?.crossesMidnight ?? false,
    plannedBreakMinutes: breakMinutes,
    plannedGrossMinutes: weekday?.plannedGrossMinutes ?? 0,
    plannedNetMinutes: weekday?.plannedNetMinutes ?? 0,
    checkLateArrival: weekday?.checkLateArrival ?? false,
    checkEarlyDeparture: weekday?.checkEarlyDeparture ?? false,
    checkAbsence: weekday?.checkAbsence ?? false,
    leaveId: leave?.id ?? null,
    calendarTemplateId: template.id,
    ruleSourceType: topAssignment ? `${topAssignment.scopeType}_CALENDAR_ASSIGNMENT` : "COMPANY_DEFAULT_CALENDAR",
    ruleSourceId: topAssignment?.id ?? template.id,
    calculationStatus: CalendarCalculationStatus.CALCULATED,
    calculationReason: topAssignment
      ? `${topAssignment.scopeType.toLowerCase()} kapsaminda atanmis calisma takvimi`
      : "Sirket varsayilan calisma takvimi",
  };
}

export async function saveResolvedEmployeeWorkCalendar(employeeId: string, workDate: Date) {
  const result = await resolveEmployeeWorkCalendar(employeeId, workDate);

  return prisma.employeeDailyCalendar.upsert({
    where: {
      employeeId_workDate: {
        employeeId,
        workDate: result.workDate,
      },
    },
    update: {
      ...result,
      calculatedAt: new Date(),
    },
    create: result,
  });
}
