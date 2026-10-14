import { parseMoney, parseSalaryInsuranceType, parseWorkforceType, type SalaryInsuranceTypeCode, type WorkforceTypeCode } from "@/lib/personnel-profile";

export type SalarySheetCsvRow = {
  name: string;
  department: string;
  position: string;
  workforceType: WorkforceTypeCode | "";
  insuranceType: SalaryInsuranceTypeCode;
  amount: number;
};

export const SALARY_SHEET_CSV_HEADERS = (amountLabel: string) => ["Ad Soyad", "Departman", "Pozisyon", "Yaka", "Çalışan Tipi", amountLabel];

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
    ? { name: find(/^ad/), department: find(/depart/), position: find(/pozis|görev|gorev/), workforce: find(/yaka|personel tip/), insurance: find(/çalışan|calisan|sgk/), amount: find(/net|brüt|brut|maaş|maas|tutar/) }
    : { name: 0, department: 1, position: 2, workforce: 3, insurance: 4, amount: 5 };
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
      workforceType: parseWorkforceType(cell(columns.workforce)) ?? "",
      insuranceType: parseSalaryInsuranceType(cell(columns.insurance)) ?? "INCENTIVE",
      amount,
    });
  });
  return { rows, skipped };
}
