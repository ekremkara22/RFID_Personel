"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { buildNextQrWindow } from "@/lib/device-qr";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyName = getString(formData, "companyName");
  const contactName = getString(formData, "contactName");
  const contactEmail = getString(formData, "contactEmail").toLowerCase();
  const contactPhone = getString(formData, "contactPhone");
  const address = getString(formData, "address");
  const city = getString(formData, "city");
  const district = getString(formData, "district");
  const category = getString(formData, "category");
  const adminFirstName = getString(formData, "adminFirstName");
  const adminLastName = getString(formData, "adminLastName");
  const adminEmail = getString(formData, "adminEmail").toLowerCase();
  const adminPassword = getString(formData, "adminPassword");

  if (
    !companyName ||
    !adminFirstName ||
    !adminLastName ||
    !adminEmail ||
    !adminPassword
  ) {
    throw new Error("Sirket ve firma yoneticisi bilgileri eksik.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        city: city || null,
        district: district || null,
        category: category || null,
      },
    });

    await tx.user.create({
      data: {
        name: `${adminFirstName} ${adminLastName}`.trim(),
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        password: passwordHash,
        role: "COMPANY_ADMIN",
        companyId: company.id,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
}

export async function createCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Kategori adi zorunludur.");
  }

  await prisma.companyCategory.create({
    data: {
      name,
    },
  });

  revalidatePath("/dashboard/settings/company-categories");
  revalidatePath("/dashboard/companies/new");
}

export async function updateCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const categoryId = getString(formData, "categoryId");
  const name = getString(formData, "name");
  const isActive = formData.get("isActive") === "on";

  if (!categoryId || !name) {
    throw new Error("Kategori bilgileri eksik.");
  }

  await prisma.companyCategory.update({
    where: { id: categoryId },
    data: {
      name,
      isActive,
    },
  });

  revalidatePath("/dashboard/settings/company-categories");
  revalidatePath("/dashboard/companies");
}

export async function createEmployeeAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const department = getString(formData, "department");
  const ageValue = getString(formData, "age");
  const latitudeValue = getString(formData, "allowedLatitude");
  const longitudeValue = getString(formData, "allowedLongitude");
  const radiusValue = getString(formData, "allowedRadiusM");
  const age = Number(ageValue);
  const allowedLatitude = Number(latitudeValue);
  const allowedLongitude = Number(longitudeValue);
  const allowedRadiusM = Number(radiusValue);

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !department ||
    !Number.isFinite(age) ||
    age < 16 ||
    !Number.isFinite(allowedLatitude) ||
    !Number.isFinite(allowedLongitude) ||
    !Number.isFinite(allowedRadiusM) ||
    allowedRadiusM <= 0
  ) {
    throw new Error("Personel bilgileri gecersiz.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.employee.create({
    data: {
      firstName,
      lastName,
      email,
      password: passwordHash,
      department,
      age,
      allowedLatitude,
      allowedLongitude,
      allowedRadiusM,
      companyId: user.companyId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
}

export async function updateEmployeeAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const employeeId = getString(formData, "employeeId");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const department = getString(formData, "department");
  const age = Number(getString(formData, "age"));
  const allowedLatitude = Number(getString(formData, "allowedLatitude"));
  const allowedLongitude = Number(getString(formData, "allowedLongitude"));
  const allowedRadiusM = Number(getString(formData, "allowedRadiusM"));
  const isActive = formData.get("isActive") === "on";

  if (
    !employeeId ||
    !firstName ||
    !lastName ||
    !email ||
    !department ||
    !Number.isFinite(age) ||
    age < 16 ||
    !Number.isFinite(allowedLatitude) ||
    !Number.isFinite(allowedLongitude) ||
    !Number.isFinite(allowedRadiusM) ||
    allowedRadiusM <= 0
  ) {
    throw new Error("Personel bilgileri gecersiz.");
  }

  await prisma.employee.updateMany({
    where: {
      id: employeeId,
      companyId: user.companyId,
    },
    data: {
      firstName,
      lastName,
      email,
      department,
      age,
      allowedLatitude,
      allowedLongitude,
      allowedRadiusM,
      isActive,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
}

export async function createDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");

  if (!name) {
    throw new Error("Cihaz adi zorunludur.");
  }

  await prisma.device.create({
    data: {
      name,
      macAddress: macAddress || null,
      companyId: user.companyId,
      ...buildNextQrWindow(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/devices");
}

export async function updateDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const deviceId = getString(formData, "deviceId");
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");

  if (!deviceId || !name) {
    throw new Error("Cihaz bilgileri eksik.");
  }

  await prisma.device.updateMany({
    where: {
      id: deviceId,
      companyId: user.companyId,
    },
    data: {
      name,
      macAddress: macAddress || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/devices");
}

export async function updateCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getString(formData, "companyId");
  const adminId = getString(formData, "adminId");
  const companyName = getString(formData, "companyName");
  const contactName = getString(formData, "contactName");
  const contactEmail = getString(formData, "contactEmail").toLowerCase();
  const contactPhone = getString(formData, "contactPhone");
  const address = getString(formData, "address");
  const city = getString(formData, "city");
  const district = getString(formData, "district");
  const category = getString(formData, "category");
  const adminFirstName = getString(formData, "adminFirstName");
  const adminLastName = getString(formData, "adminLastName");
  const adminEmail = getString(formData, "adminEmail").toLowerCase();
  const adminPassword = getString(formData, "adminPassword");

  if (!companyId || !companyName || !adminId || !adminFirstName || !adminLastName || !adminEmail) {
    throw new Error("Firma ve admin bilgileri eksik.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: companyName,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        city: city || null,
        district: district || null,
        category: category || null,
      },
    });

    await tx.user.update({
      where: { id: adminId },
      data: {
        name: `${adminFirstName} ${adminLastName}`.trim(),
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        ...(adminPassword ? { password: await bcrypt.hash(adminPassword, 10) } : {}),
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  revalidatePath("/login");
}
