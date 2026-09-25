import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const acceptedStatuses = new Set(["DOWNLOADING", "INSTALLED", "FAILED"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const deploymentId = Number(body?.deploymentId);
    const status = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
    const errorMessage = typeof body?.error === "string" ? body.error.trim().slice(0, 2000) : "";
    const currentVersion = typeof body?.currentVersion === "string"
      ? body.currentVersion.trim().slice(0, 64)
      : "";

    if (!secretKey || !Number.isSafeInteger(deploymentId) || !acceptedStatuses.has(status)) {
      return NextResponse.json({ error: "Gecersiz durum bildirimi." }, { status: 400 });
    }

    const device = await prisma.device.findFirst({ where: { secretKey } });
    if (!device) return NextResponse.json({ error: "Cihaz bulunamadi." }, { status: 404 });

    const deployment = await prisma.firmwareDeployment.findFirst({
      where: { id: deploymentId, deviceId: device.id },
      include: { release: true },
    });
    if (!deployment) return NextResponse.json({ error: "Guncelleme kaydi bulunamadi." }, { status: 404 });

    if (status === "INSTALLED" && currentVersion !== deployment.release.version) {
      return NextResponse.json({ error: "Bildirilen surum hedef surumle uyusmuyor." }, { status: 409 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.firmwareDeployment.update({
        where: { id: deployment.id },
        data: {
          status: status as "DOWNLOADING" | "INSTALLED" | "FAILED",
          lastReportedAt: now,
          ...(status === "DOWNLOADING"
            ? { downloadStartedAt: deployment.downloadStartedAt ?? now, attemptCount: { increment: 1 } }
            : {}),
          ...(status === "INSTALLED" ? { installedAt: now, lastError: null } : {}),
          ...(status === "FAILED" ? { lastError: errorMessage || "Cihaz guncellemeyi tamamlayamadi." } : {}),
        },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: {
          ...(currentVersion ? { firmwareVersion: currentVersion } : {}),
          ...(status === "INSTALLED" ? { lastFirmwareUpdateAt: now, firmwareLastError: null } : {}),
          ...(status === "FAILED" ? { firmwareLastError: errorMessage || "OTA guncellemesi basarisiz." } : {}),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Firmware status error", error);
    return NextResponse.json({ error: "Firmware durumu kaydedilemedi." }, { status: 500 });
  }
}
