import "server-only";

import { prisma } from "@/lib/prisma";

// Server component read models use this explicit gateway instead of importing
// infrastructure directly. Domain-specific repositories can replace delegates
// incrementally without changing the page boundary again.
export const queryRepository = {
  attendanceLog: prisma.attendanceLog,
  attendanceMovementAudit: prisma.attendanceMovementAudit,
  attendanceReviewResolution: prisma.attendanceReviewResolution,
  branch: prisma.branch,
  calendarAssignment: prisma.calendarAssignment,
  calendarChangeLog: prisma.calendarChangeLog,
  calendarDailyException: prisma.calendarDailyException,
  calendarSpecialDay: prisma.calendarSpecialDay,
  company: prisma.company,
  companyAccessAudit: prisma.companyAccessAudit,
  companyCategory: prisma.companyCategory,
  companyMembership: prisma.companyMembership,
  companyRole: prisma.companyRole,
  companyTeam: prisma.companyTeam,
  department: prisma.department,
  device: prisma.device,
  employee: prisma.employee,
  employeeDailyCalendar: prisma.employeeDailyCalendar,
  firmwareDeployment: prisma.firmwareDeployment,
  firmwareRelease: prisma.firmwareRelease,
  leaveRequest: prisma.leaveRequest,
  manager: prisma.manager,
  moduleDefinition: prisma.moduleDefinition,
  payrollPeriod: prisma.payrollPeriod,
  productionCustomField: prisma.productionCustomField,
  productionCycleTime: prisma.productionCycleTime,
  productionStation: prisma.productionStation,
  productionTool: prisma.productionTool,
  productionWorkCenter: prisma.productionWorkCenter,
  productionWorkOrder: prisma.productionWorkOrder,
  roleDefinition: prisma.roleDefinition,
  user: prisma.user,
  workCalendarTemplate: prisma.workCalendarTemplate,
} as const;
