import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayKey, getDateOnlyKey } from "@/lib/app-time";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { queryRepository } from "@/modules/shared/query-repository";

export type ReportSearchParams = {
  from?: string;
  to?: string;
  month?: string;
  branch?: string;
  department?: string;
  employeeId?: string;
};

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 370;

function isDayKey(value?: string): value is string {
  return Boolean(value && DAY_KEY_PATTERN.test(value) && getDateOnlyKey(dateOnlyFromKey(value)) === value);
}

function shiftDayKey(dayKey: string, days: number) {
  return getDateOnlyKey(new Date(dateOnlyFromKey(dayKey).getTime() + days * 24 * 60 * 60_000));
}

/** Rapor sayfalarının ortak bağlamı: yetki, kapsam, filtreler ve tarih aralığı. */
export async function getReportContext(params: ReportSearchParams, options: { defaultFrom?: "monthStart" | "today" } = {}) {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.REPORT_VIEW)) redirect("/dashboard");
  const companyId = authorization.companyId;
  const todayKey = getAppDayKey(new Date());
  const defaultFrom = options.defaultFrom === "today" ? todayKey : `${todayKey.slice(0, 7)}-01`;
  let toKey = isDayKey(params.to) ? params.to : todayKey;
  if (toKey > todayKey) toKey = todayKey;
  let fromKey = isDayKey(params.from) ? params.from : defaultFrom;
  if (fromKey > toKey) fromKey = toKey;
  if (shiftDayKey(fromKey, MAX_RANGE_DAYS) < toKey) fromKey = shiftDayKey(toKey, -MAX_RANGE_DAYS);

  const branch = params.branch?.trim() ?? "";
  const department = params.department?.trim() ?? "";
  const requestedEmployeeId = Number(params.employeeId);
  const scope = employeeScopeWhere(authorization);
  const restricted = authorization.scopeMode === "RESTRICTED";
  const [branches, departments, employees] = await Promise.all([
    queryRepository.branch.findMany({
      where: { companyId, isActive: true, ...(restricted && authorization.branchIds.length ? { id: { in: authorization.branchIds } } : {}) },
      orderBy: { name: "asc" },
    }),
    queryRepository.department.findMany({
      where: { companyId, isActive: true, ...(restricted && authorization.departmentIds.length ? { id: { in: authorization.departmentIds } } : {}) },
      orderBy: { name: "asc" },
    }),
    queryRepository.employee.findMany({
      where: { AND: [scope, branch ? { branch } : {}, department ? { department } : {}] },
      select: { id: true, firstName: true, lastName: true, isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const employeeId = employees.some((employee) => employee.id === requestedEmployeeId) ? requestedEmployeeId : null;
  const employeeWhere: Prisma.EmployeeWhereInput = {
    AND: [scope, branch ? { branch } : {}, department ? { department } : {}, employeeId ? { id: employeeId } : {}],
  };
  const query = new URLSearchParams({
    from: fromKey,
    to: toKey,
    ...(branch ? { branch } : {}),
    ...(department ? { department } : {}),
    ...(employeeId ? { employeeId: String(employeeId) } : {}),
  }).toString();

  return {
    authorization,
    companyId,
    canExport: can(authorization, PERMISSIONS.REPORT_EXPORT),
    todayKey,
    fromKey,
    toKey,
    branch,
    department,
    employeeId,
    branches: branches.map((item) => item.name),
    departments: departments.map((item) => item.name),
    employees: employees.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}`.trim(), isActive: item.isActive })),
    employeeWhere,
    query,
  };
}

export type ReportContext = Awaited<ReturnType<typeof getReportContext>>;

/** İki uç dahil gün anahtarları. */
export function listDayKeys(fromKey: string, toKey: string) {
  const keys: string[] = [];
  for (let key = fromKey; key <= toKey; key = shiftDayKey(key, 1)) keys.push(key);
  return keys;
}

export function formatDayLabel(dayKey: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat("tr-TR", { ...options, timeZone: APP_TIME_ZONE }).format(dateOnlyFromKey(dayKey));
}
