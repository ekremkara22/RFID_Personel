import { parseMoney, parseSalaryBasis, parseSalaryInsuranceType, type SalaryBasisCode, type SalaryInsuranceTypeCode } from "@/lib/personnel-profile";

export type SalarySheetCsvRow = {
  name: string;
  department: string;
  position: string;
  collarType: string;
  insuranceType: SalaryInsuranceTypeCode;
  amount: number;
  /** From a "Maaş Tipi" column, else from the amount header ("Net Maaş"); undefined when unknown. */
  basis?: SalaryBasisCode;
};

/** "mavi" or "MAVİ YAKA" become the default definition names; other collar names are kept as typed. */
export function normalizeCollarType(value: string) {
  const text = value.trim().replace(/\s+/g, " ");
  const lower = text.toLocaleLowerCase("tr-TR");
  if (lower === "mavi" || lower === "mavi yaka") return "Mavi Yaka";
  if (lower === "beyaz" || lower === "beyaz yaka") return "Beyaz Yaka";
  return text;
}

export const SALARY_SHEET_CSV_HEADERS = (amountLabel: string) => ["Ad Soyad", "Departman", "Pozisyon", "Yaka", "Çalışan Tipi", amountLabel];

/** Template of Muhasebe → Personel Tanımları: each row says whether its salary is gross or net. */
export function personnelCsvTemplate() {
  return [
    "Ad Soyad;Departman;Pozisyon;Yaka;Çalışan Tipi;Maaş Tipi;Maaş",
    "Ahmet Yılmaz;Üretim;Operatör;Mavi Yaka;5510 Teşvikli;Brüt;35000",
    "Ayşe Demir;Muhasebe;Uzman;Beyaz Yaka;Teşviksiz;Net;48.500,00",
  ].join("\r\n");
}

export function salarySheetCsvTemplate(amountLabel: string) {
  return [
    SALARY_SHEET_CSV_HEADERS(amountLabel).join(";"),
    "Ahmet Yılmaz;Üretim;Operatör;Mavi Yaka;5510 Teşvikli;35000",
    "Ayşe Demir;Muhasebe;Uzman;Beyaz Yaka;Teşviksiz;62.500,50",
  ].join("\r\n");
}

/** Splits CSV text, guessing the delimiter (; , or tab) from the first line and honouring quotes. */
export function splitCsv(text: string): string[][] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim());
  const first = lines[0] ?? "";
  const delimiter = [";", "\t", ","].reduce((best, candidate) => first.split(candidate).length > first.split(best).length ? candidate : best, ";");
  return lines.map((line) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(current.trim());
        current = "";
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  });
}

/**
 * Reads the "CSV'den personel yükle" file of a salary sheet. Header names are matched loosely;
 * without a header the template order is assumed. Rows with neither name nor amount are skipped.
 */
export function parseSalarySheetCsv(text: string): { rows: SalarySheetCsvRow[]; skipped: number[] } {
  const table = splitCsv(text);
  if (!table.length) return { rows: [], skipped: [] };
  const header = table[0].map((cell) => cell.toLocaleLowerCase("tr-TR"));
  const hasHeader = header.some((cell) => /ad soyad|^ad$|depart|maaş|maas|tutar/.test(cell));
  const find = (pattern: RegExp) => header.findIndex((cell) => pattern.test(cell));
  const columns = hasHeader
    ? { name: find(/^ad/), department: find(/depart/), position: find(/pozis|görev|gorev/), workforce: find(/yaka|personel tip/), insurance: find(/çalışan|calisan|sgk/), basis: header.findIndex((cell) => /(maaş|maas|ücret|ucret) tip/.test(cell)), amount: header.findIndex((cell) => /net|brüt|brut|maaş|maas|tutar/.test(cell) && !/tip/.test(cell)) }
    : { name: 0, department: 1, position: 2, workforce: 3, insurance: 4, basis: -1, amount: 5 };
  const amountHeader = hasHeader && columns.amount >= 0 ? header[columns.amount] : "";
  const headerBasis: SalaryBasisCode | undefined = /net/.test(amountHeader) ? "NET" : /brüt|brut/.test(amountHeader) ? "GROSS" : undefined;
  const rows: SalarySheetCsvRow[] = [];
  const skipped: number[] = [];

  table.slice(hasHeader ? 1 : 0).forEach((cells, index) => {
    const cell = (position: number) => position >= 0 ? cells[position] ?? "" : "";
    const name = cell(columns.name);
    const amount = parseMoney(cell(columns.amount));
    if (!name && !amount) return;
    if (!amount) {
      skipped.push(index + (hasHeader ? 2 : 1));
      return;
    }
    rows.push({
      name: name || `Personel ${rows.length + 1}`,
      department: cell(columns.department),
      position: cell(columns.position),
      collarType: normalizeCollarType(cell(columns.workforce)),
      insuranceType: parseSalaryInsuranceType(cell(columns.insurance)) ?? "INCENTIVE",
      amount,
      basis: parseSalaryBasis(cell(columns.basis)) ?? headerBasis,
    });
  });
  return { rows, skipped };
}
