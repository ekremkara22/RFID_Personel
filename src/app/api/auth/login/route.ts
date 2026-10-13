import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachSessionCookie } from "@/lib/session-cookie";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = typeof body?.identifier === "string"
      ? body.identifier.trim().toLowerCase()
      : typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Kullanıcı adı/e-posta ve şifre zorunludur." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        memberships: {
          where: { status: "ACTIVE", company: { isActive: true }, role: { isActive: true } },
          include: { company: true },
          orderBy: { id: "asc" },
        },
        moduleEntitlements: {
          select: { moduleKey: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Bu kullanıcı adı veya e-posta ile kayıtlı kullanıcı bulunamadı." },
        { status: 401 },
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Sifre hatali. Lutfen tekrar deneyin." },
        { status: 401 },
      );
    }

    // Self-registered owners always reach their license page, even after the trial ends,
    // so they can purchase a module instead of being locked out of the panel.
    const canCreateFirstCompany = user.role === "COMPANY_ADMIN" && (user.moduleEntitlements.length > 0 || user.selfRegistered);
    if (user.role !== "SUPERADMIN" && user.memberships.length === 0 && !canCreateFirstCompany) {
      return NextResponse.json(
        { error: "Aktif firma üyeliğiniz veya atanmış modül lisansınız bulunmuyor. Sistem yöneticinizle görüşün." },
        { status: 403 },
      );
    }

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.name ||
      user.email;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.memberships[0]?.companyId ?? user.companyId,
        companyName: user.memberships[0]?.company.name ?? user.company?.name ?? null,
      },
    });

    return await attachSessionCookie(request, response, {
      id: user.id,
      email: user.email,
      name: fullName,
      role: user.role,
      companyId: user.memberships[0]?.companyId ?? user.companyId,
    });
  } catch (error) {
    console.error("Login route error", error);

    return NextResponse.json(
      { error: "Giris sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
