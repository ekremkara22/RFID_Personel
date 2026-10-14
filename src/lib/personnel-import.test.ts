import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeCsv, parsePersonnelSheet, PERSONNEL_IMPORT_COLUMNS } from "./personnel-import";

const headers = PERSONNEL_IMPORT_COLUMNS.map((column) => column.label);

test("şablon başlıkları ve örnek satırları hatasız okunur", () => {
  const sheet = [headers, ...[0, 1].map((index) => PERSONNEL_IMPORT_COLUMNS.map((column) => column.example[index]))];
  const result = parsePersonnelSheet(sheet);
  assert.deepEqual(result.issues, []);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].workforceType, "BLUE_COLLAR");
  assert.equal(result.rows[1].grossSalary, 68500);
  assert.equal(result.rows[1].insuranceType, "NO_INCENTIVE");
  assert.equal(result.rows[0].hireDate?.toISOString(), "2026-01-05T00:00:00.000Z");
});

test("eksik zorunlu başlık dosyayı reddeder", () => {
  const result = parsePersonnelSheet([["Ad", "Soyad"], ["Ali", "Kaya"]]);
  assert.equal(result.rows.length, 0);
  assert.match(result.issues[0].message, /Departman/);
});

test("satır hataları satır numarasıyla raporlanır, boş satırlar atlanır", () => {
  const result = parsePersonnelSheet([
    ["ad", "SOYAD", "Departman", "Pozisyon", "Sicil No", "Personel Tipi", "Brüt Maaş"],
    ["Ali", "Kaya", "Depo", "Forklift", "7", "Mavi yaka", "40000"],
    ["", "", "", "", "", "", ""],
    ["Veli", "", "Depo", "Forklift", "7", "Gri", "abc"],
  ]);
  assert.equal(result.rows.length, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].line, 4);
  assert.match(result.issues[0].message, /soyad boş/);
  assert.match(result.issues[0].message, /2\. satırla aynı/);
});

test("Excel tarih hücresi ve Windows-1254 CSV desteklenir", () => {
  const result = parsePersonnelSheet([["Ad", "Soyad", "Departman", "Pozisyon", "Personel Tipi", "İşe Giriş Tarihi"], ["Ali", "Kaya", "Depo", "Forklift", "Mavi Yaka", new Date(2026, 0, 5)]]);
  assert.equal(result.rows[0].hireDate?.toISOString(), "2026-01-05T00:00:00.000Z");
  assert.equal(decodeCsv(new Uint8Array([0xde, 0x75, 0x62, 0x65])), "Şube");
  assert.equal(decodeCsv(new TextEncoder().encode("﻿Şube")), "Şube");
});

test("pozisyon ve personel tipi zorunludur", () => {
  const result = parsePersonnelSheet([["Ad", "Soyad", "Departman", "Pozisyon", "Personel Tipi"], ["Ali", "Kaya", "Depo", "", ""]]);
  assert.equal(result.rows.length, 0);
  assert.match(result.issues[0].message, /personel tipi boş/);
  assert.match(result.issues[0].message, /pozisyon boş/);
});
