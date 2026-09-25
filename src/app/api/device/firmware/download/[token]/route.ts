import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getFirmwarePath } from "@/lib/firmware-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/device/firmware/download/[token]">) {
  try {
    const { token } = await context.params;
    const deployment = await prisma.firmwareDeployment.findUnique({
      where: { downloadToken: token },
      include: { release: true },
    });

    if (!deployment || !deployment.release.isActive || deployment.status === "CANCELLED") {
      return NextResponse.json({ error: "Firmware bulunamadi." }, { status: 404 });
    }

    const bytes = await readFile(getFirmwarePath(deployment.release.storageKey));
    const now = new Date();
    await prisma.firmwareDeployment.update({
      where: { id: deployment.id },
      data: {
        status: "DOWNLOADING",
        downloadStartedAt: deployment.downloadStartedAt ?? now,
        lastReportedAt: now,
      },
    });

    return new Response(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="rfid-${deployment.release.version}.bin"`,
        "Cache-Control": "private, no-store",
        "X-Firmware-Version": deployment.release.version,
        "X-Firmware-SHA256": deployment.release.sha256,
      },
    });
  } catch (error) {
    console.error("Firmware download error", error);
    return NextResponse.json({ error: "Firmware dosyasi okunamadi." }, { status: 500 });
  }
}
