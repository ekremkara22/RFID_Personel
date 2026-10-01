import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, DataScopeMode, CompanyMembershipStatus } from "../src/generated/prisma/client";
import { READY_COMPANY_ROLES } from "../src/lib/permission-catalog";
import { MODULES, defaultRoleModules } from "../src/lib/module-catalog";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
const parsedUrl = new URL(databaseUrl);
const database = parsedUrl.pathname.replace(/^\//, "");
if (!database.toLowerCase().includes("staging")) {
  throw new Error(`Güvenlik nedeniyle RBAC geçişi yalnız staging veritabanında çalışır. Hedef: ${database}`);
}
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: parsedUrl.hostname, port: parsedUrl.port ? Number(parsedUrl.port) : 3306, user: decodeURIComponent(parsedUrl.username), password: decodeURIComponent(parsedUrl.password), database }) });

async function ensureRoles(companyId: number) {
  const result = new Map<string, number>();
  for (const definition of READY_COMPANY_ROLES) {
    const role = await prisma.companyRole.upsert({
      where: { companyId_key: { companyId, key: definition.key } },
      create: { companyId, key: definition.key, name: definition.name, description: definition.description, isSystem: true, isActive: true },
      update: { name: definition.name, description: definition.description, isSystem: true },
    });
    await prisma.companyRolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.companyRolePermission.createMany({ data: definition.permissions.map((permission) => ({ roleId: role.id, permission })), skipDuplicates: true });
    result.set(definition.key, role.id);
  }
  return result;
}

async function main() {
  const report = { companies: 0, roles: 0, memberships: 0, moduleGrants: 0, branchLinks: 0, departmentLinks: 0, ambiguousEmployees: [] as number[] };
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const company of companies) {
    const roles = await ensureRoles(company.id);
    report.companies += 1;
    report.roles += READY_COMPANY_ROLES.length;
    const legacyUsers = await prisma.user.findMany({
      where: { role: "COMPANY_ADMIN", OR: [{ companyId: company.id }, { companyAccess: { some: { companyId: company.id } } }] },
      select: { id: true, deviceAccess: { where: { device: { companyId: company.id } }, select: { deviceId: true } } },
    });
    for (const user of legacyUsers) {
      const membership = await prisma.companyMembership.upsert({
        where: { userId_companyId: { userId: user.id, companyId: company.id } },
        create: { userId: user.id, companyId: company.id, roleId: roles.get("OWNER")!, status: CompanyMembershipStatus.ACTIVE, scopeMode: DataScopeMode.COMPANY },
        update: {},
      });
      if (user.deviceAccess.length) {
        await prisma.membershipDeviceScope.createMany({ data: user.deviceAccess.map((item) => ({ membershipId: membership.id, deviceId: item.deviceId })), skipDuplicates: true });
      }
      if (await prisma.membershipModule.count({ where: { membershipId: membership.id } }) === 0) {
        const role = await prisma.companyRole.findUniqueOrThrow({ where: { id: membership.roleId }, select: { key: true } });
        const moduleKeys = role.key === "OWNER" || role.key === "ADMIN"
          ? [MODULES.HR, MODULES.PRODUCTION_PLANNING]
          : [MODULES.HR];
        await prisma.membershipModule.createMany({ data: moduleKeys.map((moduleKey) => ({ membershipId: membership.id, moduleKey })), skipDuplicates: true });
        report.moduleGrants += moduleKeys.length;
      }
      report.memberships += 1;
    }
    const availableModules = [...new Set((await prisma.membershipModule.findMany({ where: { membership: { companyId: company.id } }, select: { moduleKey: true } })).map((item) => item.moduleKey))];
    const companyRoles = await prisma.companyRole.findMany({ where: { companyId: company.id, modules: { none: {} } }, select: { id: true, key: true } });
    for (const role of companyRoles) {
      const preferred = defaultRoleModules(role.key).filter((moduleKey) => availableModules.includes(moduleKey));
      const roleModules = preferred.length ? preferred : availableModules;
      if (roleModules.length) await prisma.companyRoleModule.createMany({ data: roleModules.map((moduleKey) => ({ roleId: role.id, moduleKey })), skipDuplicates: true });
    }
  }

  const memberships = await prisma.companyMembership.findMany({ where: { modules: { none: {} } }, select: { id: true, role: { select: { key: true } } } });
  for (const membership of memberships) {
    const moduleKeys = membership.role.key === "OWNER" || membership.role.key === "ADMIN"
      ? [MODULES.HR, MODULES.PRODUCTION_PLANNING]
      : [MODULES.HR];
    await prisma.membershipModule.createMany({
      data: moduleKeys.map((moduleKey) => ({ membershipId: membership.id, moduleKey })),
      skipDuplicates: true,
    });
  }

  const employees = await prisma.employee.findMany({ select: { id: true, companyId: true, branch: true, department: true, branchId: true, departmentId: true } });
  for (const employee of employees) {
    const branches = employee.branch && !employee.branchId ? await prisma.branch.findMany({ where: { companyId: employee.companyId, name: employee.branch }, select: { id: true } }) : [];
    const departments = employee.department && !employee.departmentId ? await prisma.department.findMany({ where: { companyId: employee.companyId, name: employee.department }, select: { id: true } }) : [];
    if (branches.length > 1 || departments.length > 1) report.ambiguousEmployees.push(employee.id);
    const branchId = employee.branchId ?? (branches.length === 1 ? branches[0].id : null);
    const departmentId = employee.departmentId ?? (departments.length === 1 ? departments[0].id : null);
    if (branchId !== employee.branchId || departmentId !== employee.departmentId) {
      await prisma.employee.update({ where: { id: employee.id }, data: { branchId, departmentId } });
      if (branchId) report.branchLinks += 1;
      if (departmentId) report.departmentLinks += 1;
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

main().finally(() => prisma.$disconnect());
