import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve sifre zorunludur." },
        { status: 400 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!employee || !employee.password) {
      return NextResponse.json(
        { error: "Personel hesabi bulunamadi." },
        { status: 401 },
      );
    }

    if (!employee.email) {
      return NextResponse.json(
        { error: "Personel hesabinda e-posta eksik." },
        { status: 400 },
      );
    }

    if (!employee.isActive || !employee.company.isActive) {
      return NextResponse.json(
        { error: "Personel hesabi pasif durumda." },
        { status: 403 },
      );
    }

    const passwordMatches = await bcrypt.compare(password, employee.password);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Sifre hatali." },
        { status: 401 },
      );
    }

    const token = await signToken({
      id: employee.id,
      email: employee.email,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      role: "EMPLOYEE",
      companyId: employee.companyId,
      actorType: "employee",
    });

    return NextResponse.json({
      token,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        companyName: employee.company.name,
      },
      movementTypes: [
        "ENTRY",
        "EXIT",
        "BREAK_START",
        "BREAK_END",
        "MEAL_START",
        "MEAL_END",
      ],
    });
  } catch (error) {
    console.error("Mobile login error", error);

    return NextResponse.json(
      { error: "Mobil giris sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
