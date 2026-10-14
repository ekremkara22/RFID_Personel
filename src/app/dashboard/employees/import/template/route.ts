import * as XLSX from "xlsx";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { PERSONNEL_IMPORT_COLUMNS } from "@/lib/personnel-import";
import { requireSessionUser } from "@/lib/session";

function csvCell(value: string) {
  return /[;"\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export async function GET(request: Request) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.PERSONNEL_CREATE);
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const headers = PERSONNEL_IMPORT_COLUMNS.map((column) => column.label);
  const examples = [0, 1].map((index) => PERSONNEL_IMPORT_COLUMNS.map((column) => column.example[index]));

  if (format === "csv") {
    // Semicolon + BOM opens correctly in Turkish Excel without the import wizard.
    const body = "﻿" + [headers, ...examples].map((row) => row.map(csvCell).join(";")).join("\r\n");
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=personel-ice-aktarma-sablonu.csv" } });
  }

  const workbook = XLSX.utils.book_new();
  // Every cell is text so Excel does not reformat dates, sicil numbers or amounts.
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...examples].map((row) => row.map((value) => ({ v: value, t: "s" }))));
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Personeller");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new Response(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=personel-ice-aktarma-sablonu.xlsx" } });
}
