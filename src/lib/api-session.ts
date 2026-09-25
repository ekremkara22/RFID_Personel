import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getApiSessionUser() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifyToken(token);
  if (!session || !Number.isSafeInteger(session.id) || session.id <= 0) return null;

  return prisma.user.findUnique({ where: { id: session.id } });
}
