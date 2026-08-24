import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireEmployeeFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return null;
  }

  const session = await verifyToken(token);

  if (!session || session.actorType !== "employee") {
    return null;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.id },
    include: { company: true },
  });

  if (!employee || !employee.isActive || !employee.company.isActive) {
    return null;
  }

  return employee;
}
