import { parseImportDate, parseMoney, parseSalaryInsuranceType, parseWorkforceType, type SalaryInsuranceTypeCode, type WorkforceTypeCode } from "@/lib/personnel-profile";

export const PERSONNEL_IMPORT_MAX_ROWS = 1000;

/** Column order of the downloadable template; aliases below also accept common variations. */
export const PERSONNEL_IMPORT_COLUMNS = [
  { key: "firstName", label: "Ad", required: true, example: ["Ahmet", "Ayşe"] },
  { key: "lastName", label: "Soyad", required: true, example: ["Yılmaz", "Demir"] },
  { key: "department", label: "Departman", required: true, example: ["Üretim", "Muhasebe"] },
  { key: "position", label: "Pozisyon", required: false, example: ["Operatör", "Muhasebe Uzmanı"] },
  { key: "workforceType", label: "Personel Tipi", required: false, example: ["Mavi Yaka", "Beyaz Yaka"] },
  { key: "registrationNumber", label: "Sicil No", required: false, example: ["1001", "1002"] },
  { key: "email", label: "E-posta", required: false, example: ["", "ayse.demir@firma.com"] },
  { key: "branch", label: "Şube", required: false, example: ["", ""] },
  { key: "managerName", label: "Yönetici", required: false, example: ["", ""] },
  { key: "hireDate", label: "İşe Giriş Tarihi", required: false, example: ["05.01.2026", "15.03.2025"] },
  { key: "age", label: "Yaş", required: false, example: ["32", "28"] },
  { key: "rfidCardId", label: "RFID Kart No", required: false, example: ["", ""] },
  { key: "grossSalary", label: "Brüt Maaş", required: false, example: ["45.000,00", "68.500,00"] },
  { key: "insuranceType", label: "SGK Tipi", required: false, example: ["5510 Teşvikli", "Teşviksiz"] },
] as const;

export type PersonnelImportKey = (typeof PERSONNEL_IMPORT_COLUMNS)[number]["key"];

const HEADER_ALIASES: Record<string, PersonnelImportKey> = {
  ad: "firstName", adi: "firstName", isim: "firstName",
  soyad: "lastName", soyadi: "lastName",
  departman: "department", bolum: "department",
  pozisyon: "position", gorev: "position", unvan: "position",
  personeltipi: "workforceType", yakatipi: "workforceType", yaka: "workforceType",
  sicilno: "registrationNumber", sicilnumarasi: "registrationNumber", sicil: "registrationNumber",
  eposta: "email", email: "email", mail: "email",
  sube: "branch",
  yonetici: "managerName", baglioldugyonetici: "managerName",
  isegiristarihi: "hireDate", giristarihi: "hireDate",
  yas: "age",
  rfidkartno: "rfidCardId", rfid: "rfidCardId", kartno: "rfidCardId", rfidkartnumarasi: "rfidCardId",
  brutmaas: "grossSalary", maas: "grossSalary", brutucret: "grossSalary",
  sgktipi: "insuranceType", sgk: "insuranceType",
};

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/[^a-z0-9]/g, "");
}

export type PersonnelImportRow = {
  line: number;
  firstName: string;
  lastName: string;
  department: string;
  position: string | null;
  workforceType: WorkforceTypeCode | null;
  registrationNumber: string | null;
  email: string | null;
  branch: string | null;
  managerName: string | null;
  hireDate: Date | null;
  age: number;
  rfidCardId: string | null;
  grossSalary: number | null;
  insuranceType: SalaryInsuranceTypeCode;
};

export type PersonnelImportIssue = { line: number; message: string };

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  return String(value).trim();
}

/** Excel dates arrive as Date objects in the server's zone; keep the calendar day the user typed. */
function dateFromCell(value: unknown) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  return parseImportDate(String(value ?? ""));
}

/**
 * Turns a sheet (first row = headers) into validated personnel rows.
 * Only checks what the file itself can prove; company lookups and duplicates in the database happen in the action.
 */
export function parsePersonnelSheet(sheet: unknown[][]): { rows: PersonnelImportRow[]; issues: PersonnelImportIssue[] } {
  const [headerRow = [], ...body] = sheet;
  const columnIndex = new Map<PersonnelImportKey, number>();
  headerRow.forEach((header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (key && !columnIndex.has(key)) columnIndex.set(key, index);
  });
  const missing = PERSONNEL_IMPORT_COLUMNS.filter((column) => column.required && !columnIndex.has(column.key)).map((column) => column.label);
  if (missing.length) return { rows: [], issues: [{ line: 1, message: `Başlık satırında zorunlu sütun eksik: ${missing.join(", ")}. Şablonu indirip başlıkları değiştirmeden kullanın.` }] };

  const rows: PersonnelImportRow[] = [];
  const issues: PersonnelImportIssue[] = [];
  const seen = { registrationNumber: new Map<string, number>(), email: new Map<string, number>(), rfidCardId: new Map<string, number>() };

  body.forEach((cells, index) => {
    const line = index + 2;
    const raw = (key: PersonnelImportKey) => {
      const position = columnIndex.get(key);
      return position === undefined ? "" : cells[position];
    };
    const text = (key: PersonnelImportKey) => {
      const value = cellText(raw(key));
      return value instanceof Date ? "" : value;
    };
    if (cells.every((cell) => cellText(cell) === "")) return;

    const problems: string[] = [];
    const firstName = text("firstName");
    const lastName = text("lastName");
    const department = text("department").replace(/\s+/g, " ");
    if (!firstName) problems.push("ad boş");
    if (!lastName) problems.push("soyad boş");
    if (!department) problems.push("departman boş");

    const workforceType = parseWorkforceType(text("workforceType"));
    if (workforceType === undefined) problems.push(`personel tipi "${text("workforceType")}" tanınmadı (Mavi Yaka / Beyaz Yaka)`);
    const insuranceType = parseSalaryInsuranceType(text("insuranceType"));
    if (insuranceType === undefined) problems.push(`SGK tipi "${text("insuranceType")}" tanınmadı (5510 Teşvikli / Teşviksiz / Emekli)`);
    const salaryRaw = raw("grossSalary");
    const grossSalary = typeof salaryRaw === "number" ? parseMoney(salaryRaw) : parseMoney(text("grossSalary"));
    if (grossSalary === undefined) problems.push("brüt maaş geçerli bir tutar değil");
    const hireDate = dateFromCell(raw("hireDate"));
    if (hireDate === undefined) problems.push("işe giriş tarihi GG.AA.YYYY biçiminde olmalı");
    const ageText = text("age");
    const age = ageText ? Number(ageText) : 18;
    if (!Number.isInteger(age) || age < 16 || age > 90) problems.push("yaş 16–90 arasında tam sayı olmalı");
    const email = text("email").toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("e-posta geçersiz");
    const registrationNumber = text("registrationNumber") || null;
    const rfidCardId = text("rfidCardId").toUpperCase() || null;

    for (const [key, value, label] of [["registrationNumber", registrationNumber, "sicil no"], ["email", email, "e-posta"], ["rfidCardId", rfidCardId, "RFID kart no"]] as const) {
      if (!value) continue;
      const earlier = seen[key].get(value);
      if (earlier) problems.push(`${label} ${earlier}. satırla aynı`);
      else seen[key].set(value, line);
    }

    if (problems.length) {
      issues.push({ line, message: problems.join("; ") });
      return;
    }
    rows.push({
      line,
      firstName,
      lastName,
      department,
      position: text("position").replace(/\s+/g, " ") || null,
      workforceType: workforceType ?? null,
      registrationNumber,
      email,
      branch: text("branch") || null,
      managerName: text("managerName") || null,
      hireDate: hireDate ?? null,
      age,
      rfidCardId,
      grossSalary: grossSalary ?? null,
      insuranceType: insuranceType!,
    });
  });

  return { rows, issues };
}

/** Excel in Türkiye saves CSV as Windows-1254; fall back to it when the bytes are not valid UTF-8. */
export function decodeCsv(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1254").decode(bytes);
  }
}
