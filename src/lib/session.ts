import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await verifyToken(token);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      company: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.role === "COMPANY_ADMIN" && (!user.company || !user.company.isActive)) {
    redirect("/login");
  }

  return {
    session,
    user,
  };
}
