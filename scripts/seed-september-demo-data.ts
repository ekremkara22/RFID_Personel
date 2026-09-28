import {
  AttendanceType,
  CalendarCalculationStatus,
  EmploymentStatus,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveType,
  PayrollPeriodStatus,
  WorkDayType,
} from "../src/generated/prisma/client";
import { dateOnlyFromKey } from "../src/lib/app-time";
import { prisma } from "../src/lib/prisma";

const YEAR = 2026;
const MONTH = 9;
const SEED_PREFIX = "demo-sep-2026";
const LEAVE_MARKER = "[EYLÜL 2026 DEMO]";
const RANGE_START = dateOnlyFromKey("2026-09-01");
const RANGE_END = dateOnlyFromKey("2026-10-01");

function assertStagingDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = (() => {
    try {
      return new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0];
    } catch {
      return "";
    }
  })();

  if (!databaseName.toLocaleLowerCase("tr-TR").includes("staging")) {
    throw new Error(`Bu veri üreticisi yalnız staging veritabanında çalışır. Algılanan veritabanı: ${databaseName || "bilinmiyor"}`);
  }
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replaceAll("ş", "s").replaceAll("ı", "i");
}

function dayKey(day: number) {
  return `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function istanbulDateTime(day: number, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(YEAR, MONTH - 1, day, hour - 3, minute, 0, 0));
}

function isWeekday(day: number) {
  const weekday = new Date(Date.UTC(YEAR, MONTH - 1, day, 12)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

type DemoEmployeeKey = "regular" | "late" | "break" | "leave" | "error" | "conflict" | "early" | "absent";

const employeeDefinitions: Array<{
  key: DemoEmployeeKey;
  firstName: string;
  lastName: string;
  department: string;
  branch: string;
  registrationNumber: string;
  email: string;
  rfidCardId: string;
}> = [
  { key: "regular", firstName: "Deniz", lastName: "Düzenli", department: "Operasyon", branch: "Merkez", registrationNumber: "DEMO26-001", email: "demo26.regular@example.invalid", rfidCardId: "DEMO26001" },
  { key: "late", firstName: "Gökhan", lastName: "Geciken", department: "Operasyon", branch: "Merkez", registrationNumber: "DEMO26-002", email: "demo26.late@example.invalid", rfidCardId: "DEMO26002" },
  { key: "break", firstName: "Merve", lastName: "Molalı", department: "Üretim", branch: "Fabrika", registrationNumber: "DEMO26-003", email: "demo26.break@example.invalid", rfidCardId: "DEMO26003" },
  { key: "leave", firstName: "İrem", lastName: "İzinli", department: "İnsan Kaynakları", branch: "Merkez", registrationNumber: "DEMO26-004", email: "demo26.leave@example.invalid", rfidCardId: "DEMO26004" },
  { key: "error", firstName: "Hakan", lastName: "Kontrol", department: "Üretim", branch: "Fabrika", registrationNumber: "DEMO26-005", email: "demo26.error@example.invalid", rfidCardId: "DEMO26005" },
  { key: "conflict", firstName: "Çiğdem", lastName: "Çakışan", department: "İnsan Kaynakları", branch: "Merkez", registrationNumber: "DEMO26-006", email: "demo26.conflict@example.invalid", rfidCardId: "DEMO26006" },
  { key: "early", firstName: "Emre", lastName: "Erken", department: "Operasyon", branch: "Merkez", registrationNumber: "DEMO26-007", email: "demo26.early@example.invalid", rfidCardId: "DEMO26007" },
  { key: "absent", firstName: "Selen", lastName: "Devamsız", department: "Üretim", branch: "Fabrika", registrationNumber: "DEMO26-008", email: "demo26.absent@example.invalid", rfidCardId: "DEMO26008" },
];

async function main() {
  assertStagingDatabase();

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const company = companies.find((item) => normalizeName(item.name) === "demo sirketi");
  if (!company) {
    throw new Error(`Demo Şirketi bulunamadı. Mevcut firmalar: ${companies.map((item) => item.name).join(", ")}`);
  }

  const branches = new Map<string, number>();
  for (const name of ["Merkez", "Fabrika"]) {
    const branch = await prisma.branch.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      create: { companyId: company.id, name, location: name === "Merkez" ? "İstanbul" : "Kocaeli", isActive: true },
      update: { isActive: true },
    });
    branches.set(name, branch.id);
  }

  const departments = new Map<string, number>();
  for (const name of ["Operasyon", "Üretim", "İnsan Kaynakları"]) {
    const department = await prisma.department.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      create: { companyId: company.id, name, isActive: true },
      update: { isActive: true },
    });
    departments.set(name, department.id);
  }

  const device = await prisma.device.upsert({
    where: { companyId_code: { companyId: company.id, code: "DEMO-SIM-2026" } },
    create: { companyId: company.id, code: "DEMO-SIM-2026", name: "Eylül Demo RFID Cihazı", branchLocation: "Test Veri Üreticisi" },
    update: { name: "Eylül Demo RFID Cihazı", branchLocation: "Test Veri Üreticisi" },
  });

  const employees = new Map<DemoEmployeeKey, Awaited<ReturnType<typeof prisma.employee.upsert>>>();
  for (const definition of employeeDefinitions) {
    const employee = await prisma.employee.upsert({
      where: { email: definition.email },
      create: {
        companyId: company.id,
        branchId: branches.get(definition.branch),
        departmentId: departments.get(definition.department),
        firstName: definition.firstName,
        lastName: definition.lastName,
        email: definition.email,
        age: 30,
        department: definition.department,
        branch: definition.branch,
        registrationNumber: definition.registrationNumber,
        rfidCardId: definition.rfidCardId,
        hireDate: dateOnlyFromKey("2025-01-01"),
        isActive: true,
      },
      update: {
        companyId: company.id,
        branchId: branches.get(definition.branch),
        departmentId: departments.get(definition.department),
        firstName: definition.firstName,
        lastName: definition.lastName,
        department: definition.department,
        branch: definition.branch,
        registrationNumber: definition.registrationNumber,
        rfidCardId: definition.rfidCardId,
        isActive: true,
      },
    });
    employees.set(definition.key, employee);
  }

  const employeeIds = [...employees.values()].map((employee) => employee.id);
  await prisma.attendanceReviewResolution.deleteMany({
    where: { employeeId: { in: employeeIds }, workDate: { gte: RANGE_START, lt: RANGE_END } },
  });
  await prisma.attendanceLog.deleteMany({
    where: { deviceId: device.id, clientEventId: { startsWith: SEED_PREFIX } },
  });
  await prisma.employeeDailyCalendar.deleteMany({
    where: { employeeId: { in: employeeIds }, workDate: { gte: RANGE_START, lt: RANGE_END } },
  });
  await prisma.leaveRequest.deleteMany({
    where: { employeeId: { in: employeeIds }, description: { startsWith: LEAVE_MARKER } },
  });

  const leaveEmployee = employees.get("leave")!;
  const conflictEmployee = employees.get("conflict")!;
  const approvedAnnual = await prisma.leaveRequest.create({
    data: { companyId: company.id, employeeId: leaveEmployee.id, type: LeaveType.ANNUAL, durationType: LeaveDurationType.FULL_DAY, approvalStatus: LeaveApprovalStatus.APPROVED, startDate: dateOnlyFromKey("2026-09-07"), endDate: dateOnlyFromKey("2026-09-09"), description: `${LEAVE_MARKER} Onaylı yıllık izin` },
  });
  const approvedHalfDay = await prisma.leaveRequest.create({
    data: { companyId: company.id, employeeId: leaveEmployee.id, type: LeaveType.HALF_DAY, durationType: LeaveDurationType.HALF_DAY, approvalStatus: LeaveApprovalStatus.APPROVED, startDate: dateOnlyFromKey("2026-09-17"), endDate: dateOnlyFromKey("2026-09-17"), startTime: "13:00", endTime: "18:00", description: `${LEAVE_MARKER} Onaylı yarım gün izin` },
  });
  await prisma.leaveRequest.createMany({ data: [
    { companyId: company.id, employeeId: leaveEmployee.id, type: LeaveType.HOURLY, durationType: LeaveDurationType.HOURLY, approvalStatus: LeaveApprovalStatus.PENDING, startDate: dateOnlyFromKey("2026-09-23"), endDate: dateOnlyFromKey("2026-09-23"), startTime: "14:00", endTime: "16:00", description: `${LEAVE_MARKER} Onay bekleyen saatlik izin` },
    { companyId: company.id, employeeId: leaveEmployee.id, type: LeaveType.EXCUSE, durationType: LeaveDurationType.FULL_DAY, approvalStatus: LeaveApprovalStatus.REJECTED, startDate: dateOnlyFromKey("2026-09-24"), endDate: dateOnlyFromKey("2026-09-24"), description: `${LEAVE_MARKER} Reddedilmiş mazeret izni` },
  ] });
  const currentDayLeave = await prisma.leaveRequest.create({
    data: { companyId: company.id, employeeId: leaveEmployee.id, type: LeaveType.ADMINISTRATIVE, durationType: LeaveDurationType.FULL_DAY, approvalStatus: LeaveApprovalStatus.APPROVED, startDate: dateOnlyFromKey("2026-09-28"), endDate: dateOnlyFromKey("2026-09-28"), description: `${LEAVE_MARKER} Bugünkü izin durumu örneği` },
  });
  const conflictAnnual = await prisma.leaveRequest.create({
    data: { companyId: company.id, employeeId: conflictEmployee.id, type: LeaveType.ANNUAL, durationType: LeaveDurationType.FULL_DAY, approvalStatus: LeaveApprovalStatus.APPROVED, startDate: dateOnlyFromKey("2026-09-14"), endDate: dateOnlyFromKey("2026-09-16"), description: `${LEAVE_MARKER} Çakışma örneği - yıllık izin` },
  });
  const conflictMedical = await prisma.leaveRequest.create({
    data: { companyId: company.id, employeeId: conflictEmployee.id, type: LeaveType.MEDICAL, durationType: LeaveDurationType.FULL_DAY, approvalStatus: LeaveApprovalStatus.APPROVED, startDate: dateOnlyFromKey("2026-09-15"), endDate: dateOnlyFromKey("2026-09-17"), description: `${LEAVE_MARKER} Çakışma örneği - sağlık raporu` },
  });

  for (const [key, employee] of employees.entries()) {
    for (let day = 1; day <= 30; day += 1) {
      const weekday = isWeekday(day);
      let dayType: WorkDayType = weekday ? WorkDayType.NORMAL_WORK : WorkDayType.WEEKLY_REST;
      let calculationStatus: CalendarCalculationStatus = CalendarCalculationStatus.CALCULATED;
      let calculationReason = weekday ? "Eylül 2026 demo çalışma planı" : "Hafta tatili";
      let leaveId: number | null = null;
      let plannedStart: string | null = weekday ? "08:30" : null;
      let plannedEnd: string | null = weekday ? "18:00" : null;

      if (key === "leave" && day >= 7 && day <= 9) {
        dayType = WorkDayType.LEAVE;
        leaveId = approvedAnnual.id;
        plannedStart = null;
        plannedEnd = null;
        calculationReason = "Onaylı yıllık izin";
      } else if (key === "leave" && day === 17) {
        dayType = WorkDayType.LEAVE;
        leaveId = approvedHalfDay.id;
        plannedStart = "08:30";
        plannedEnd = "13:00";
        calculationReason = "Onaylı yarım gün izin";
      } else if (key === "leave" && day === 28) {
        dayType = WorkDayType.LEAVE;
        leaveId = currentDayLeave.id;
        plannedStart = null;
        plannedEnd = null;
        calculationReason = "Onaylı idari izin";
      } else if (key === "conflict" && (day === 15 || day === 16)) {
        dayType = WorkDayType.CONFLICT;
        calculationStatus = CalendarCalculationStatus.CONFLICT;
        calculationReason = "Yıllık izin ile sağlık raporu tarihleri çakışıyor";
        plannedStart = null;
        plannedEnd = null;
      } else if (key === "conflict" && day === 14) {
        dayType = WorkDayType.LEAVE;
        leaveId = conflictAnnual.id;
        plannedStart = null;
        plannedEnd = null;
        calculationReason = "Onaylı yıllık izin";
      } else if (key === "conflict" && day === 17) {
        dayType = WorkDayType.LEAVE;
        leaveId = conflictMedical.id;
        plannedStart = null;
        plannedEnd = null;
        calculationReason = "Onaylı sağlık raporu";
      }

      const isWorkingDay = dayType === WorkDayType.NORMAL_WORK;
      await prisma.employeeDailyCalendar.create({
        data: {
          employeeId: employee.id,
          workDate: dateOnlyFromKey(dayKey(day)),
          employmentStatus: EmploymentStatus.ACTIVE,
          dayType,
          plannedStart,
          plannedEnd,
          plannedBreakStart: isWorkingDay ? "12:30" : null,
          plannedBreakEnd: isWorkingDay ? "13:00" : null,
          plannedBreakMinutes: isWorkingDay ? 30 : 0,
          plannedGrossMinutes: isWorkingDay ? 570 : 0,
          plannedNetMinutes: isWorkingDay ? 540 : 0,
          checkLateArrival: isWorkingDay,
          checkEarlyDeparture: isWorkingDay,
          checkAbsence: isWorkingDay,
          leaveId,
          ruleSourceType: "STAGING_DEMO_SEED",
          calculationStatus,
          calculationReason,
        },
      });
    }
  }

  const logs: Array<{
    employeeId: number;
    deviceId: number;
    clientEventId: string;
    scannedAt: Date;
    receivedAt: Date;
    type: AttendanceType;
    rfidCardId: string;
  }> = [];

  function addLog(key: DemoEmployeeKey, day: number, time: string, type: AttendanceType, suffix: string, delayedMinutes = 0) {
    const employee = employees.get(key)!;
    const scannedAt = istanbulDateTime(day, time);
    logs.push({
      employeeId: employee.id,
      deviceId: device.id,
      clientEventId: `${SEED_PREFIX}-${key}-${String(day).padStart(2, "0")}-${suffix}`,
      scannedAt,
      receivedAt: new Date(scannedAt.getTime() + (delayedMinutes ? delayedMinutes * 60_000 : 15_000)),
      type,
      rfidCardId: employee.rfidCardId!,
    });
  }

  function addCompleteDay(key: DemoEmployeeKey, day: number, entry: string, breakStart: string, breakEnd: string, exit: string, delayedEntryMinutes = 0) {
    addLog(key, day, entry, AttendanceType.ENTRY, "entry", delayedEntryMinutes);
    addLog(key, day, breakStart, AttendanceType.BREAK_START, "break-start");
    addLog(key, day, breakEnd, AttendanceType.BREAK_END, "break-end");
    addLog(key, day, exit, AttendanceType.EXIT, "exit");
  }

  const approvedLeaveDays = new Set([7, 8, 9, 17, 28]);
  const conflictLeaveDays = new Set([14, 15, 16, 17]);
  const absentDays = new Set([2, 10, 21]);
  const errorDays = new Set([3, 8, 11, 18]);

  for (let day = 1; day <= 25; day += 1) {
    if (!isWeekday(day)) continue;
    addCompleteDay("regular", day, "08:24", "12:30", "13:00", "18:01");
    addCompleteDay("late", day, day % 2 === 0 ? "09:12" : "08:48", "12:35", "13:05", "18:05");
    addCompleteDay("break", day, "08:28", "12:00", day % 2 === 0 ? "13:30" : "13:15", "18:00");
    if (!approvedLeaveDays.has(day)) addCompleteDay("leave", day, "08:27", "12:30", "13:00", "18:00");
    if (!conflictLeaveDays.has(day)) addCompleteDay("conflict", day, "08:26", "12:30", "13:00", "18:00");
    addCompleteDay("early", day, "08:29", "12:30", "13:00", day % 3 === 0 ? "16:30" : "18:00");
    if (!absentDays.has(day)) addCompleteDay("absent", day, "08:25", "12:30", "13:00", "18:00");

    if (!errorDays.has(day)) {
      addCompleteDay("error", day, "08:28", "12:30", "13:00", "18:00");
    }
  }

  addLog("error", 3, "08:28", AttendanceType.ENTRY, "entry");
  addLog("error", 3, "12:30", AttendanceType.BREAK_START, "break-start");
  addLog("error", 3, "13:00", AttendanceType.BREAK_END, "break-end");
  addLog("error", 8, "08:28", AttendanceType.ENTRY, "entry");
  addLog("error", 8, "12:10", AttendanceType.BREAK_START, "break-start-1");
  addLog("error", 8, "12:35", AttendanceType.BREAK_START, "break-start-2");
  addLog("error", 8, "13:05", AttendanceType.BREAK_END, "break-end");
  addLog("error", 8, "18:00", AttendanceType.EXIT, "exit");
  addCompleteDay("error", 11, "08:28", "12:30", "13:00", "18:00", 20);
  addLog("error", 18, "08:31", AttendanceType.ENTRY, "entry");

  addLog("regular", 28, "08:25", AttendanceType.ENTRY, "entry");
  addLog("late", 28, "09:14", AttendanceType.ENTRY, "entry");
  addLog("break", 28, "08:28", AttendanceType.ENTRY, "entry");
  addLog("break", 28, "12:10", AttendanceType.BREAK_START, "break-start");
  addLog("error", 28, "08:29", AttendanceType.ENTRY, "entry");
  addLog("early", 28, "08:29", AttendanceType.ENTRY, "entry");
  addLog("absent", 28, "08:25", AttendanceType.ENTRY, "entry");

  await prisma.attendanceLog.createMany({ data: logs });
  await prisma.payrollPeriod.upsert({
    where: { companyId_year_month: { companyId: company.id, year: YEAR, month: MONTH } },
    create: { companyId: company.id, year: YEAR, month: MONTH, status: PayrollPeriodStatus.OPEN },
    update: {
      status: PayrollPeriodStatus.OPEN,
      snapshotJson: null,
      snapshotCreatedAt: null,
      approvalNote: null,
      approvedById: null,
      approvedAt: null,
      lockedById: null,
      lockedAt: null,
    },
  });

  const leaveCount = await prisma.leaveRequest.count({ where: { employeeId: { in: employeeIds }, description: { startsWith: LEAVE_MARKER } } });
  const calendarCount = await prisma.employeeDailyCalendar.count({ where: { employeeId: { in: employeeIds }, workDate: { gte: RANGE_START, lt: RANGE_END } } });
  const movementCount = await prisma.attendanceLog.count({ where: { deviceId: device.id, clientEventId: { startsWith: SEED_PREFIX } } });
  console.log(JSON.stringify({ company: company.name, year: YEAR, month: MONTH, employees: employeeIds.length, calendars: calendarCount, movements: movementCount, leaves: leaveCount, scenarios: ["normal hareket", "yoğun geç kalma", "mola limiti aşımı", "onaylı/bekleyen/reddedilen izin", "eksik çıkış", "eşleşmeyen mola", "gecikmeli aktarım", "çakışan izin", "erken çıkış", "devamsızlık", "bugün çalışıyor/molada/izinli"] }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
