import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/api-session";
import {
  getFirmwarePath,
  getFirmwareStorageDirectory,
  MAX_FIRMWARE_SIZE_BYTES,
} from "@/lib/firmware-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function redirectWithMessage(request: Request, kind: "success" | "error", message: string) {
  const url = new URL("/dashboard/firmware-updates", request.url);
  url.searchParams.set(kind, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const user = await getApiSessionUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Bu islem icin yetkiniz yok." }, { status: 403 });
  }

  let storedPath: string | null = null;

  try {
    const formData = await request.formData();
    const version = String(formData.get("version") ?? "").trim();
    const releaseNotes = String(formData.get("releaseNotes") ?? "").trim();
    const firmware = formData.get("firmware");

    if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
      return redirectWithMessage(request, "error", "Surum 1.0.0 biciminde olmalidir.");
    }
    if (!(firmware instanceof File) || firmware.size === 0) {
      return redirectWithMessage(request, "error", "Firmware .bin dosyasi secilmelidir.");
    }
    if (!firmware.name.toLowerCase().endsWith(".bin")) {
      return redirectWithMessage(request, "error", "Yalnizca .bin firmware dosyasi yuklenebilir.");
    }
    if (firmware.size > MAX_FIRMWARE_SIZE_BYTES) {
      return redirectWithMessage(request, "error", "Firmware dosyasi 4 MB sinirini asiyor.");
    }

    const bytes = Buffer.from(await firmware.arrayBuffer());
    if (bytes[0] !== 0xe9) {
      return redirectWithMessage(request, "error", "Dosya ESP32 uygulama firmware'i olarak taninamadi.");
    }

    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const storageKey = `${randomUUID()}.bin`;
    await mkdir(getFirmwareStorageDirectory(), { recursive: true });
    storedPath = getFirmwarePath(storageKey);
    await writeFile(storedPath, bytes, { flag: "wx" });

    await prisma.firmwareRelease.create({
      data: {
        version,
        releaseNotes: releaseNotes || null,
        originalFileName: firmware.name.slice(0, 255),
        storageKey,
        sizeBytes: bytes.length,
        sha256,
        createdById: user.id,
      },
    });

    return redirectWithMessage(request, "success", `${version} surumu yuklendi.`);
  } catch (error) {
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    console.error("Firmware upload error", error);
    return redirectWithMessage(
      request,
      "error",
      "Firmware yuklenemedi. Surum numarasinin daha once kullanilmadigini kontrol edin.",
    );
  }
}
