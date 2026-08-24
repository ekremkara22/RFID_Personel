import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth";
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

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Bu e-posta adresiyle kayitli kullanici bulunamadi." },
        { status: 401 },
      );
    }

    if (user.company && !user.company.isActive) {
      return NextResponse.json(
        { error: "Sirket hesabi pasif durumda oldugu icin giris yapilamiyor." },
        { status: 403 },
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Sifre hatali. Lutfen tekrar deneyin." },
        { status: 401 },
      );
    }

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.name ||
      user.email;

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: fullName,
      role: user.role,
      companyId: user.companyId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name ?? null,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Login route error", error);

    return NextResponse.json(
      { error: "Giris sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
