import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ActionError } from "@/lib/action-error";

export async function saveEmployeePhoto(formData: FormData, fallback?: string | null) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return fallback ?? null;
  if (!file.type.startsWith("image/")) throw new ActionError("Personel resmi icin gecerli bir gorsel dosyasi secilmelidir.");

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "employees");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/employees/${filename}`;
}
