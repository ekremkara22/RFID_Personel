import path from "node:path";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { PUANTAJ_DAY_CODE_LABELS, type PuantajDayCode } from "@/lib/attendance-day-calculation";
import { PAYROLL_STATUS_LABELS, type PayrollView } from "./payroll-data";

const FONT_DIR = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
/** 615 → "10:15" (saat:dakika) */
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

const TOTAL_COLUMNS = [
  ["Çalışılan gün", (row: PayrollView["summaryRows"][number]) => row.attendedDays],
  ["Planlanan (dk)", (row: PayrollView["summaryRows"][number]) => row.plannedMinutes],
  ["Net çalışma (dk)", (row: PayrollView["summaryRows"][number]) => row.workedMinutes],
  ["Fazla mesai (dk)", (row: PayrollView["summaryRows"][number]) => row.overtimeMinutes],
  ["Tatil çalışması (dk)", (row: PayrollView["summaryRows"][number]) => row.holidayWorkMinutes],
  ["Eksik süre (dk)", (row: PayrollView["summaryRows"][number]) => row.missingMinutes],
  ["Geç kalma (dk)", (row: PayrollView["summaryRows"][number]) => row.lateMinutes],
  ["Erken çıkış (dk)", (row: PayrollView["summaryRows"][number]) => row.earlyLeaveMinutes],
  ["İzin (gün)", (row: PayrollView["summaryRows"][number]) => row.leaveDays],
  ["Devamsız (gün)", (row: PayrollView["summaryRows"][number]) => row.missingDays],
  ["Kontrol (gün)", (row: PayrollView["summaryRows"][number]) => row.errorDays],
] as const;

function title(view: PayrollView, companyName: string) {
  return `${companyName} · ${view.monthKey} Puantaj Cetveli · ${PAYROLL_STATUS_LABELS[view.status]}`;
}

export function buildPayrollWorkbook(view: PayrollView, companyName: string) {
  const workbook = XLSX.utils.book_new();
  const dayNumbers = view.dayKeys.map((key) => Number(key.slice(8)));
  const header = ["Sicil", "Personel", "Şube", "Departman", ...dayNumbers, ...TOTAL_COLUMNS.map(([label]) => label)];
  const body = view.summaryRows.map((row) => {
    const days = view.daysByEmployee.get(row.employeeId);
    return [row.registrationNumber, row.employee, row.branch, row.department, ...view.dayKeys.map((key) => days?.get(key)?.code ?? ""), ...TOTAL_COLUMNS.map(([, pick]) => pick(row))];
  });
  const sheet = XLSX.utils.aoa_to_sheet([[title(view, companyName)], [], header, ...body]);
  sheet["!cols"] = [{ wch: 10 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, ...dayNumbers.map(() => ({ wch: 4 })), ...TOTAL_COLUMNS.map(([label]) => ({ wch: Math.max(10, label.length + 1) }))];
  sheet["!freeze"] = { xSplit: 2, ySplit: 3 };
  XLSX.utils.book_append_sheet(workbook, sheet, "Puantaj Cetveli");

  const breakTracking = view.snapshot.trackingMode !== "ENTRY_EXIT_ONLY";
  const detailHeader = ["Sicil", "Personel", "Şube", "Departman", "Tarih", "Kod", "Planlanan giriş", "Planlanan çıkış", "İlk giriş", "Son çıkış", "Planlanan (dk)", "Net çalışma (dk)", "Düşülen mola (dk)", ...(breakTracking ? ["Ölçülen mola (dk)"] : []), "Fazla mesai (dk)", "Tatil çalışması (dk)", "Eksik (dk)", "Geç (dk)", "Erken çıkış (dk)", "İzin", "Hareketler", "Kontrol durumu"];
  const detailBody = view.detailRows.map((row) => [row.registrationNumber, row.employee, row.branch, row.department, row.date, row.code, row.plannedStart, row.plannedEnd, row.firstEntry, row.lastExit, row.plannedMinutes, row.workedMinutes, row.breakMinutes, ...(breakTracking ? [row.actualBreakMinutes] : []), row.overtimeMinutes, row.holidayWorkMinutes, row.missingMinutes, row.lateMinutes, row.earlyLeaveMinutes, row.leaveType, row.movements, row.issues]);
  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeader, ...detailBody]);
  detailSheet["!cols"] = detailHeader.map((label) => ({ wch: label === "Hareketler" ? 60 : Math.max(10, label.length + 2) }));
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Günlük Detay");

  const legend = (Object.entries(PUANTAJ_DAY_CODE_LABELS) as Array<[PuantajDayCode, string]>).map(([code, label]) => [code, label]);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Kod", "Anlamı"], ...legend]), "Kodlar");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const COLORS: Record<string, string> = { "Ç": "#067647", "G": "#B54708", "Y": "#175CD3", "İ": "#175CD3", "R": "#5925DC", "Üİ": "#C11574", "HT": "#98A2B3", "RT": "#98A2B3", "D": "#B42318", "!": "#B42318" };

export async function renderPayrollPdf(view: PayrollView, companyName: string) {
  const doc = new PDFDocument({ autoFirstPage: false, size: "A4", layout: "landscape", margins: { top: 0, left: 0, right: 0, bottom: 0 }, bufferPages: true, info: { Title: title(view, companyName), Author: "Flodeska PDKS" } });
  doc.registerFont("Noto", path.join(FONT_DIR, "DejaVuSans.ttf"));
  doc.registerFont("NotoBold", path.join(FONT_DIR, "DejaVuSans-Bold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const completion = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const page = { width: 841.89, height: 595.28, margin: 24 };
  const nameWidth = 120;
  const totals = [["Gün", (row: PayrollView["summaryRows"][number]) => String(row.attendedDays)], ["Net", (row: PayrollView["summaryRows"][number]) => clock(row.workedMinutes)], ["FM", (row: PayrollView["summaryRows"][number]) => clock(row.overtimeMinutes + row.holidayWorkMinutes)], ["Eksik", (row: PayrollView["summaryRows"][number]) => clock(row.missingMinutes)], ["Geç dk", (row: PayrollView["summaryRows"][number]) => String(row.lateMinutes)], ["İzin", (row: PayrollView["summaryRows"][number]) => String(row.leaveDays)], ["Dev.", (row: PayrollView["summaryRows"][number]) => String(row.missingDays)]] as const;
  const totalWidth = 34;
  const dayWidth = (page.width - page.margin * 2 - nameWidth - totals.length * totalWidth) / view.dayKeys.length;
  const rowHeight = 18;
  const tableTop = 74;

  const drawHeader = () => {
    doc.font("NotoBold").fontSize(13).fillColor("#101828").text(title(view, companyName), page.margin, 22);
    doc.font("Noto").fontSize(7).fillColor("#667085").text(`Oluşturulma: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date())} · Süreler saat:dakika · FM: fazla mesai + tatil çalışması · Dev.: devamsız gün`, page.margin, 40);
    let x = page.margin;
    const y = tableTop - rowHeight;
    doc.rect(page.margin, y, page.width - page.margin * 2, rowHeight).fill("#F2F4F7");
    doc.font("NotoBold").fontSize(6.5).fillColor("#475467").text("Personel", x + 4, y + 6, { width: nameWidth - 8 });
    x += nameWidth;
    for (const key of view.dayKeys) { doc.text(String(Number(key.slice(8))), x, y + 6, { width: dayWidth, align: "center" }); x += dayWidth; }
    for (const [label] of totals) { doc.text(label, x, y + 6, { width: totalWidth, align: "center" }); x += totalWidth; }
  };

  doc.addPage();
  drawHeader();
  let y = tableTop;
  for (const row of view.summaryRows) {
    if (y + rowHeight > page.height - 40) { doc.addPage(); drawHeader(); y = tableTop; }
    const days = view.daysByEmployee.get(row.employeeId);
    doc.moveTo(page.margin, y + rowHeight).lineTo(page.width - page.margin, y + rowHeight).lineWidth(0.4).stroke("#EAECF0");
    let x = page.margin;
    doc.font("NotoBold").fontSize(6.5).fillColor("#101828").text(row.employee, x + 4, y + 3, { width: nameWidth - 8, lineBreak: false, ellipsis: true });
    doc.font("Noto").fontSize(5.5).fillColor("#667085").text(`${row.registrationNumber} · ${row.department}`, x + 4, y + 10.5, { width: nameWidth - 8, lineBreak: false, ellipsis: true });
    x += nameWidth;
    for (const key of view.dayKeys) {
      const code = days?.get(key)?.code ?? "";
      if (code) doc.font("NotoBold").fontSize(5.8).fillColor(COLORS[code] ?? "#344054").text(code, x, y + 6, { width: dayWidth, align: "center", lineBreak: false });
      x += dayWidth;
    }
    for (const [, pick] of totals) { doc.font("Noto").fontSize(6.5).fillColor("#101828").text(pick(row), x, y + 6, { width: totalWidth, align: "center", lineBreak: false }); x += totalWidth; }
    y += rowHeight;
  }

  const legendY = Math.min(y + 14, page.height - 30);
  doc.font("Noto").fontSize(6.5).fillColor("#475467").text((Object.entries(PUANTAJ_DAY_CODE_LABELS)).map(([code, label]) => `${code}: ${label}`).join("   "), page.margin, legendY, { width: page.width - page.margin * 2 });

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.font("Noto").fontSize(6.5).fillColor("#98A2B3").text(`Sayfa ${index + 1} / ${range.count}`, page.margin, page.height - 18, { width: page.width - page.margin * 2, align: "right", lineBreak: false });
  }
  doc.end();
  return completion;
}
