import path from "node:path";
import PDFDocument from "pdfkit";
import type { OperationReportData, OperationReportRow } from "@/lib/operation-report";

const COLORS = {
  ink: "#101828",
  muted: "#667085",
  border: "#DDE3EC",
  soft: "#F8FAFC",
  primary: "#1570EF",
  late: "#EF4444",
  lateDark: "#B42318",
  break: "#F59E0B",
  breakDark: "#B54708",
  absent: "#7F56D9",
  white: "#FFFFFF",
};

const PAGE = { width: 841.89, height: 595.28, margin: 28 };
const FONT_DIR = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");

function minutes(value: number) {
  if (value < 60) return `${value} dk`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

function fitText(doc: PDFKit.PDFDocument, text: string, maxWidth: number) {
  if (doc.widthOfString(text) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && doc.widthOfString(`${result}...`) > maxWidth) result = result.slice(0, -1);
  return `${result}...`;
}

function roundedPanel(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, fill = COLORS.white) {
  doc.roundedRect(x, y, width, height, 7).fillAndStroke(fill, COLORS.border);
}

function drawHeader(doc: PDFKit.PDFDocument, data: OperationReportData, pageNumber: number) {
  doc.font("NotoBold").fontSize(17).fillColor(COLORS.ink).text(data.title, PAGE.margin, 24);
  doc.font("Noto").fontSize(7).fillColor(COLORS.muted).text(`Oluşturulma: ${data.generatedAtLabel}`, PAGE.margin, 47);
  const badgeWidth = 90;
  doc.roundedRect(PAGE.width - PAGE.margin - badgeWidth, 24, badgeWidth, 25, 6).fill(COLORS.primary);
  doc.font("NotoBold").fontSize(9).fillColor(COLORS.white)
    .text(`${data.periodLabel} PDF`, PAGE.width - PAGE.margin - badgeWidth, 32, { width: badgeWidth, align: "center" });
  doc.font("Noto").fontSize(6.5).fillColor(COLORS.muted)
    .text(`Sayfa ${pageNumber}`, PAGE.width - PAGE.margin - 55, 52, { width: 55, align: "right" });
}

function drawFilters(doc: PDFKit.PDFDocument, data: OperationReportData, y: number) {
  roundedPanel(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 43, COLORS.soft);
  const items = [
    ["RAPOR ARALIĞI", data.rangeLabel],
    ["SEÇİLİ TARİH", data.selectedDateLabel],
    ["FİRMA", data.filters.company],
    ["ŞUBE", data.filters.branch],
    ["DEPARTMAN", data.filters.department],
  ];
  const columnWidth = (PAGE.width - PAGE.margin * 2 - 24) / items.length;
  items.forEach(([label, value], index) => {
    const x = PAGE.margin + 12 + index * columnWidth;
    doc.font("NotoBold").fontSize(5.5).fillColor(COLORS.muted).text(label, x, y + 9, { width: columnWidth - 8 });
    doc.font("Noto").fontSize(7.5).fillColor(COLORS.ink).text(fitText(doc, value, columnWidth - 8), x, y + 23, { width: columnWidth - 8 });
  });
}

function drawKpis(doc: PDFKit.PDFDocument, data: OperationReportData, y: number) {
  const gap = 8;
  const width = (PAGE.width - PAGE.margin * 2 - gap * 3) / 4;
  const cards = [
    ["GEÇ KALAN PERSONEL", String(data.metrics.lateEmployeeCount), "kişi", COLORS.primary],
    ["TOPLAM GEÇ KALMA", minutes(data.metrics.lateTotalMinutes), "seçili dönem", COLORS.lateDark],
    ["ORTALAMA GEÇ KALMA", minutes(data.metrics.averageLateMinutes), "geç kalan kişi başına", COLORS.late],
    ["ORTALAMA MOLA", minutes(data.metrics.averageBreakMinutes), "personel-gün başına", COLORS.breakDark],
  ];
  cards.forEach(([label, value, note, color], index) => {
    const x = PAGE.margin + index * (width + gap);
    roundedPanel(doc, x, y, width, 55);
    doc.font("NotoBold").fontSize(5.7).fillColor(COLORS.muted).text(label, x + 10, y + 8, { width: width - 20 });
    doc.font("NotoBold").fontSize(13).fillColor(color).text(value, x + 10, y + 21, { width: width - 20 });
    doc.font("Noto").fontSize(5.8).fillColor(COLORS.muted).text(note, x + 10, y + 42, { width: width - 20 });
  });
}

function drawPersonRow(doc: PDFKit.PDFDocument, row: OperationReportRow, x: number, y: number, width: number, maxMinutes: number) {
  const nameWidth = 91;
  const valueWidth = 34;
  const trackX = x + nameWidth + 6;
  const trackWidth = width - nameWidth - valueWidth * 2 - 22;
  doc.font("NotoBold").fontSize(6.3).fillColor(COLORS.ink).text(fitText(doc, row.employeeName, nameWidth), x, y, { width: nameWidth });
  doc.font("Noto").fontSize(4.9).fillColor(COLORS.muted).text(fitText(doc, row.department, nameWidth), x, y + 8, { width: nameWidth });
  doc.roundedRect(trackX, y + 3, trackWidth, 8, 2).fill("#EDF2F7");
  const lateWidth = maxMinutes ? trackWidth * row.lateMinutes / maxMinutes : 0;
  const breakWidth = maxMinutes ? trackWidth * row.breakMinutes / maxMinutes : 0;
  if (lateWidth > 0) doc.roundedRect(trackX, y + 3, Math.max(1, lateWidth), 8, 2).fill(COLORS.late);
  if (breakWidth > 0) doc.roundedRect(trackX + lateWidth, y + 3, Math.max(1, Math.min(trackWidth - lateWidth, breakWidth)), 8, 2).fill(COLORS.break);
  doc.font("NotoBold").fontSize(5.5).fillColor(COLORS.lateDark).text(`${row.lateMinutes} dk`, trackX + trackWidth + 5, y + 4, { width: valueWidth, align: "right" });
  doc.fillColor(COLORS.breakDark).text(`${row.breakMinutes} dk`, trackX + trackWidth + valueWidth + 9, y + 4, { width: valueWidth, align: "right" });
}

function drawPersonnelPanel(doc: PDFKit.PDFDocument, rows: OperationReportRow[], y: number, panelHeight: number, pageRowStart: number, totalRows: number) {
  const panelWidth = PAGE.width - PAGE.margin * 2;
  roundedPanel(doc, PAGE.margin, y, panelWidth, panelHeight);
  doc.font("NotoBold").fontSize(9).fillColor(COLORS.ink).text("Personel Geç Kalma ve Mola Süreleri", PAGE.margin + 12, y + 10);
  doc.font("Noto").fontSize(5.8).fillColor(COLORS.muted)
    .text(`${pageRowStart + 1}-${Math.min(pageRowStart + rows.length, totalRows)} / ${totalRows} personel`, PAGE.margin + 310, y + 12, { width: 95, align: "right" });
  doc.roundedRect(PAGE.width - PAGE.margin - 122, y + 10, 7, 7, 2).fill(COLORS.late);
  doc.font("Noto").fontSize(5.8).fillColor(COLORS.muted).text("Geç kalma", PAGE.width - PAGE.margin - 111, y + 10);
  doc.roundedRect(PAGE.width - PAGE.margin - 58, y + 10, 7, 7, 2).fill(COLORS.break);
  doc.text("Mola", PAGE.width - PAGE.margin - 47, y + 10);
  if (!rows.length) {
    doc.font("Noto").fontSize(8).fillColor(COLORS.muted).text("Filtrelere uygun personel bulunamadı.", PAGE.margin + 12, y + 46);
    return;
  }
  const gap = 18;
  const columnWidth = (panelWidth - 24 - gap) / 2;
  const maxMinutes = Math.max(1, ...rows.map((row) => row.lateMinutes + row.breakMinutes));
  rows.forEach((row, index) => {
    const column = index >= 10 ? 1 : 0;
    const rowIndex = index % 10;
    drawPersonRow(doc, row, PAGE.margin + 12 + column * (columnWidth + gap), y + 31 + rowIndex * 16.3, columnWidth, maxMinutes);
  });
}

function drawRankingCard(doc: PDFKit.PDFDocument, title: string, rows: OperationReportRow[], x: number, y: number, width: number, color: string, value: (row: OperationReportRow) => string) {
  roundedPanel(doc, x, y, width, 151);
  doc.roundedRect(x, y, width, 26, 7).fill(color);
  doc.rect(x, y + 19, width, 7).fill(color);
  doc.font("NotoBold").fontSize(7.2).fillColor(COLORS.white).text(title, x + 10, y + 9, { width: width - 20 });
  if (!rows.length) {
    doc.font("Noto").fontSize(6.5).fillColor(COLORS.muted).text("Bu dönem için kayıt yok.", x + 10, y + 42, { width: width - 20 });
    return;
  }
  rows.forEach((row, index) => {
    const rowY = y + 32 + index * 11.2;
    if (index % 2 === 0) doc.rect(x + 6, rowY - 2, width - 12, 10.5).fill(COLORS.soft);
    doc.font("NotoBold").fontSize(5.6).fillColor(color).text(String(index + 1), x + 10, rowY, { width: 12 });
    doc.font("Noto").fillColor(COLORS.ink).text(fitText(doc, row.employeeName, width - 82), x + 25, rowY, { width: width - 82 });
    doc.font("NotoBold").fillColor(color).text(value(row), x + width - 53, rowY, { width: 43, align: "right" });
  });
}

function drawRankings(doc: PDFKit.PDFDocument, data: OperationReportData, y: number) {
  const gap = 8;
  const width = (PAGE.width - PAGE.margin * 2 - gap * 2) / 3;
  drawRankingCard(doc, "En Çok Geç Kalan 10 Personel", data.topLate, PAGE.margin, y, width, COLORS.lateDark, (row) => minutes(row.lateMinutes));
  drawRankingCard(doc, "En Çok Mola Kullanan 10 Personel", data.topBreak, PAGE.margin + width + gap, y, width, COLORS.breakDark, (row) => minutes(row.breakMinutes));
  drawRankingCard(doc, "En Çok İşe Gelmeyen 10 Personel", data.topAbsent, PAGE.margin + (width + gap) * 2, y, width, COLORS.absent, (row) => `${row.absentDays} gün`);
}

function drawFooter(doc: PDFKit.PDFDocument) {
  doc.moveTo(PAGE.margin, PAGE.height - 19).lineTo(PAGE.width - PAGE.margin, PAGE.height - 19).strokeColor(COLORS.border).stroke();
  doc.font("Noto").fontSize(5.5).fillColor(COLORS.muted)
    .text("Flodeska PDKS - Operasyon Özeti", PAGE.margin, PAGE.height - 14, { width: 220 });
  doc.text("Geç kalma ve mola süreleri dakika bazında hesaplanmıştır.", PAGE.width - PAGE.margin - 260, PAGE.height - 14, { width: 260, align: "right" });
}

export async function renderOperationReportPdf(data: OperationReportData) {
  const doc = new PDFDocument({ autoFirstPage: false, size: "A4", layout: "landscape", margins: { top: 0, left: 0, right: 0, bottom: 0 }, bufferPages: true, info: { Title: `${data.periodLabel} Operasyon Özeti`, Author: "Flodeska PDKS", Subject: data.rangeLabel } });
  doc.registerFont("Noto", path.join(FONT_DIR, "DejaVuSans.ttf"));
  doc.registerFont("NotoBold", path.join(FONT_DIR, "DejaVuSans-Bold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const completion = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const rowPages = Math.max(1, Math.ceil(data.rows.length / 20));
  for (let pageIndex = 0; pageIndex < rowPages; pageIndex += 1) {
    doc.addPage();
    drawHeader(doc, data, pageIndex + 1);
    drawFilters(doc, data, 66);
    drawKpis(doc, data, 117);
    const pageRows = data.rows.slice(pageIndex * 20, pageIndex * 20 + 20);
    if (pageIndex === 0) {
      drawPersonnelPanel(doc, pageRows, 180, 194, pageIndex * 20, data.rows.length);
      drawRankings(doc, data, 382);
    } else {
      drawPersonnelPanel(doc, pageRows, 117, 215, pageIndex * 20, data.rows.length);
    }
    drawFooter(doc);
  }
  doc.end();
  return completion;
}
