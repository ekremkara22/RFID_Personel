import { NextResponse } from "next/server";
import { queryRepository } from "@/modules/shared/query-repository";
import { getReportContext } from "../../report-context";
import { getPayrollView } from "../payroll-data";
import { buildPayrollWorkbook, renderPayrollPdf } from "../payroll-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const ctx = await getReportContext({
    month: searchParams.get("month") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    department: searchParams.get("department") ?? undefined,
  });
  if (!ctx.canExport) return NextResponse.json({ error: "Bu raporu indirmek için yetkiniz bulunmuyor." }, { status: 403 });
  const [view, company] = await Promise.all([
    getPayrollView(ctx, searchParams.get("month") ?? undefined),
    queryRepository.company.findUnique({ where: { id: ctx.companyId }, select: { name: true } }),
  ]);
  const companyName = company?.name ?? "Firma";
  const filename = `puantaj-${view.monthKey}`;
  if (searchParams.get("format") === "pdf") {
    const pdf = await renderPayrollPdf(view, companyName);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "private, no-store" } });
  }
  const xlsx = buildPayrollWorkbook(view, companyName);
  return new Response(new Uint8Array(xlsx), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "private, no-store" } });
}
