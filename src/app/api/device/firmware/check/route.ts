import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const currentVersion = typeof body?.currentVersion === "string"
      ? body.currentVersion.trim().slice(0, 64)
      : "";
    const macAddress = typeof body?.macAddress === "string"
      ? body.macAddress.trim().toUpperCase().slice(0, 32)
      : "";

    if (!secretKey || !currentVersion) {
      return NextResponse.json({ error: "Secret key ve firmware surumu zorunludur." }, { status: 400 });
    }

    const device = await prisma.device.findFirst({ where: { secretKey } });
    if (!device) return NextResponse.json({ error: "Cihaz bulunamadi." }, { status: 404 });

    await prisma.device.update({
      where: { id: device.id },
      data: {
        firmwareVersion: currentVersion,
        lastFirmwareCheckAt: new Date(),
        ...(macAddress ? { macAddress } : {}),
      },
    });

    const deployments = await prisma.firmwareDeployment.findMany({
      where: {
        deviceId: device.id,
        status: { in: ["PENDING", "DOWNLOADING"] },
        release: { isActive: true },
      },
      include: { release: true },
      orderBy: { requestedAt: "asc" },
    });

    for (const deployment of deployments) {
      if (deployment.release.version !== currentVersion) continue;
      await prisma.$transaction([
        prisma.firmwareDeployment.update({
          where: { id: deployment.id },
          data: { status: "INSTALLED", installedAt: new Date(), lastReportedAt: new Date(), lastError: null },
        }),
        prisma.device.update({
          where: { id: device.id },
          data: { lastFirmwareUpdateAt: new Date(), firmwareLastError: null },
        }),
      ]);
    }

    const deployment = deployments.find((item) => item.release.version !== currentVersion);
    if (!deployment) {
      return NextResponse.json({ updateAvailable: false, checkIntervalSeconds: 21600 });
    }

    return NextResponse.json({
      updateAvailable: true,
      checkIntervalSeconds: 21600,
      deploymentId: deployment.id,
      version: deployment.release.version,
      size: deployment.release.sizeBytes,
      sha256: deployment.release.sha256,
      url: `/api/device/firmware/download/${deployment.downloadToken}`,
    });
  } catch (error) {
    console.error("Firmware check error", error);
    return NextResponse.json({ error: "Firmware kontrolu yapilamadi." }, { status: 500 });
  }
}
