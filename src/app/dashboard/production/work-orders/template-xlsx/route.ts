import * as XLSX from "xlsx";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

export async function GET() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.CAPACITY_VIEW);
  if (!authorization.companyId) return new Response("Aktif firma seçilmedi.", { status: 400 });
  const fields = await prisma.productionCustomField.findMany({ where: { companyId: authorization.companyId, entity: "WORK_ORDER", isActive: true }, orderBy: { displayOrder: "asc" }, select: { label: true } });
  const headers = ["İş Emri No", "Sipariş No", "Parça Kodu", "Parça Adı", "Miktar", "İstasyon Kodu", "Kalıp/Aparat Kodu", "Çevrim Süresi (sn)", "Göz Adedi", "Hazırlık Süresi (dk)", "Termin Tarihi", ...fields.map((field) => field.label)];
  const example = ["IE-2026-0001", "SIP-2026-010", "PRT-1001", "Örnek Parça", 1000, "ENJ-01", "KALIP-01", 45, 2, 30, "2026-10-30", ...fields.map(() => "")];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(16, header.length + 2) }));
  XLSX.utils.book_append_sheet(workbook, sheet, "İş Emirleri");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new Response(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=uretim-planlama-is-emri-sablonu.xlsx" } });
}
