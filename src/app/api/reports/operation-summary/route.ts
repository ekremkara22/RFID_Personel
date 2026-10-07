import { NextResponse } from "next/server";
import { can } from "@/lib/authorization";
import { buildOperationReportData } from "@/lib/operation-report";
import { renderOperationReportPdf } from "@/lib/operation-report-pdf";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, authorization } = await requireSessionUser();
  if (!can(authorization, PERMISSIONS.REPORT_EXPORT)) {
    return NextResponse.json({ error: "Bu raporu indirmek için yetkiniz bulunmuyor." }, { status: 403 });
  }
  const searchParams = new URL(request.url).searchParams;
  const report = await buildOperationReportData({
    user,
    authorization,
    date: searchParams.get("date"),
    period: searchParams.get("period"),
    companyId: searchParams.get("companyId"),
    branch: searchParams.get("branch"),
    department: searchParams.get("department"),
  });
  const pdf = await renderOperationReportPdf(report);
  const filename = `operasyon-ozeti-${report.period}-${searchParams.get("date") ?? "bugun"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
