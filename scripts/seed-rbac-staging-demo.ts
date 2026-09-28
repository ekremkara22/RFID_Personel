import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { CompanyMembershipStatus, CompanyInvitationStatus, DataScopeMode, Role } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

function assertStagingDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = (() => {
    try { return new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0]; } catch { return ""; }
  })();
  if (!databaseName.toLowerCase().includes("staging")) throw new Error(`Güvenlik nedeniyle demo verisi yalnız staging veritabanında oluşturulur. Algılanan veritabanı: ${databaseName || "bilinmiyor"}`);
}

async function companyByName(name: string) {
  return (await prisma.company.findFirst({ where: { name } })) ?? prisma.company.create({ data: { name, category: "RBAC sentetik test", isActive: true } });
}

async function employee(companyId: number, branchId: number, departmentId: number, suffix: string, firstName: string) {
  const email = `rbac.${suffix}@example.invalid`;
  return prisma.employee.upsert({
    where: { email },
    create: { companyId, branchId, departmentId, firstName, lastName: "Sentetik", email, age: 30, department: "Operasyon", branch: suffix.includes("b2") ? "Şube 2" : "Şube 1", registrationNumber: `RBAC-${suffix.toUpperCase()}` },
    update: { companyId, branchId, departmentId, firstName, lastName: "Sentetik", department: "Operasyon", branch: suffix.includes("b2") ? "Şube 2" : "Şube 1", isActive: true },
  });
}

async function user(email: string, passwordHash: string, firstName: string) {
  return prisma.user.upsert({ where: { email }, create: { email, password: passwordHash, firstName, lastName: "Sentetik", name: `${firstName} Sentetik`, role: Role.COMPANY_ADMIN }, update: { password: passwordHash, firstName, lastName: "Sentetik", name: `${firstName} Sentetik`, role: Role.COMPANY_ADMIN } });
}

async function membership(userId: number, companyId: number, roleKey: string, scopeMode: DataScopeMode, options?: { employeeId?: number; branchIds?: number[]; status?: CompanyMembershipStatus }) {
  const role = await prisma.companyRole.findUnique({ where: { companyId_key: { companyId, key: roleKey } } });
  if (!role) throw new Error(`${companyId} firmasındaki ${roleKey} rolü bulunamadı; önce rbac:migrate:staging çalıştırın.`);
  const result = await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, roleId: role.id, scopeMode, status: options?.status ?? CompanyMembershipStatus.ACTIVE, employeeId: options?.employeeId },
    update: { roleId: role.id, scopeMode, status: options?.status ?? CompanyMembershipStatus.ACTIVE, employeeId: options?.employeeId ?? null, sessionVersion: { increment: 1 } },
  });
  await prisma.membershipBranchScope.deleteMany({ where: { membershipId: result.id } });
  if (options?.branchIds?.length) await prisma.membershipBranchScope.createMany({ data: options.branchIds.map((branchId) => ({ membershipId: result.id, branchId })) });
  return result;
}

async function main() {
  assertStagingDatabase();
  const password = process.env.RBAC_DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error("RBAC_DEMO_PASSWORD en az 12 karakter olmalıdır.");
  const passwordHash = await bcrypt.hash(password, 12);
  const companyA = await companyByName("[STAGING RBAC] Atlas Demo");
  const companyB = await companyByName("[STAGING RBAC] Bora Demo");
  const [branchA1, branchA2, branchB1] = await Promise.all([
    prisma.branch.upsert({ where: { companyId_name: { companyId: companyA.id, name: "Şube 1" } }, create: { companyId: companyA.id, name: "Şube 1" }, update: { isActive: true } }),
    prisma.branch.upsert({ where: { companyId_name: { companyId: companyA.id, name: "Şube 2" } }, create: { companyId: companyA.id, name: "Şube 2" }, update: { isActive: true } }),
    prisma.branch.upsert({ where: { companyId_name: { companyId: companyB.id, name: "Şube 1" } }, create: { companyId: companyB.id, name: "Şube 1" }, update: { isActive: true } }),
  ]);
  const [departmentA, departmentB] = await Promise.all([
    prisma.department.upsert({ where: { companyId_name: { companyId: companyA.id, name: "Operasyon" } }, create: { companyId: companyA.id, name: "Operasyon" }, update: { isActive: true } }),
    prisma.department.upsert({ where: { companyId_name: { companyId: companyB.id, name: "Operasyon" } }, create: { companyId: companyB.id, name: "Operasyon" }, update: { isActive: true } }),
  ]);
  const [employeeA1, employeeA2] = await Promise.all([
    employee(companyA.id, branchA1.id, departmentA.id, "a-b1", "Aylin"),
    employee(companyA.id, branchA2.id, departmentA.id, "a-b2", "Baran"),
    employee(companyB.id, branchB1.id, departmentB.id, "b-b1", "Ceren"),
  ]);
  const [owner, manager, staff, payroll, technician, suspended, multi] = await Promise.all([
    user("rbac.owner@example.invalid", passwordHash, "Oya"),
    user("rbac.manager@example.invalid", passwordHash, "Mert"),
    user("rbac.employee@example.invalid", passwordHash, "Ece"),
    user("rbac.payroll@example.invalid", passwordHash, "Pelin"),
    user("rbac.technician@example.invalid", passwordHash, "Tekin"),
    user("rbac.suspended@example.invalid", passwordHash, "Selin"),
    user("rbac.multi@example.invalid", passwordHash, "Melis"),
  ]);
  await membership(owner.id, companyA.id, "OWNER", DataScopeMode.COMPANY);
  await membership(manager.id, companyA.id, "SCOPE_MANAGER", DataScopeMode.RESTRICTED, { branchIds: [branchA1.id] });
  await membership(staff.id, companyA.id, "EMPLOYEE", DataScopeMode.OWN, { employeeId: employeeA1.id });
  await membership(payroll.id, companyA.id, "PAYROLL", DataScopeMode.COMPANY);
  await membership(technician.id, companyA.id, "DEVICE_TECH", DataScopeMode.RESTRICTED);
  await membership(suspended.id, companyA.id, "OBSERVER", DataScopeMode.COMPANY, { status: CompanyMembershipStatus.SUSPENDED });
  await membership(multi.id, companyA.id, "HR", DataScopeMode.COMPANY);
  await membership(multi.id, companyB.id, "OBSERVER", DataScopeMode.COMPANY);

  const adminRole = await prisma.companyRole.findUniqueOrThrow({ where: { companyId_key: { companyId: companyA.id, key: "ADMIN" } } });
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.companyInvitation.updateMany({ where: { companyId: companyA.id, email: "rbac.invite@example.invalid", status: CompanyInvitationStatus.PENDING }, data: { status: CompanyInvitationStatus.REVOKED } });
  await prisma.companyInvitation.create({ data: { companyId: companyA.id, email: "rbac.invite@example.invalid", roleId: adminRole.id, tokenHash: createHash("sha256").update(rawToken).digest("hex"), status: CompanyInvitationStatus.PENDING, scopeMode: DataScopeMode.COMPANY, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), createdById: owner.id } });

  const managerMembership = await prisma.companyMembership.findUniqueOrThrow({ where: { userId_companyId: { userId: manager.id, companyId: companyA.id } }, include: { branchScopes: true } });
  if (managerMembership.branchScopes.length !== 1 || managerMembership.branchScopes[0].branchId !== branchA1.id) throw new Error("Şube yöneticisi kapsam doğrulaması başarısız.");
  if (employeeA1.companyId === companyB.id || employeeA2.branchId === branchA1.id) throw new Error("Sentetik firma/şube izolasyonu doğrulanamadı.");
  console.log(JSON.stringify({ companyAId: companyA.id, companyBId: companyB.id, demoEmails: [owner.email, manager.email, staff.email, payroll.email, technician.email, suspended.email, multi.email], invitationUrl: `https://test.flodeska.com/activate/${rawToken}` }, null, 2));
}

main().finally(() => prisma.$disconnect());
