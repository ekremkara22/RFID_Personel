import { prisma } from "@/lib/prisma";

export async function getSmartHomeDashboard(ownerId: number) {
  return prisma.smartHomeGateway.findMany({
    where: { ownerId },
    include: {
      nodes: { where: { isActive: true }, orderBy: [{ room: "asc" as const }, { name: "asc" as const }] },
      commands: { orderBy: { requestedAt: "desc" as const }, take: 8, include: { node: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}
