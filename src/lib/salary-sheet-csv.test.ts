import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSalarySheetCsv, personnelCsvTemplate, salarySheetCsvTemplate, splitCsv } from "./salary-sheet-csv";

test("hesaplama şablonu kendi okuyucusuyla hatasız yüklenir", () => {
  const result = parseSalarySheetCsv(salarySheetCsvTemplate("Brüt Maaş"));
  assert.deepEqual(result.skipped, []);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows[0], { name: "Ahmet Yılmaz", department: "Üretim", position: "Operatör", collarType: "Mavi Yaka", insuranceType: "INCENTIVE", amount: 35000, basis: "GROSS" });
  assert.equal(result.rows[1].amount, 62500.5);
  assert.equal(result.rows[1].insuranceType, "NO_INCENTIVE");
});

test("başlıksız ve virgül ayraçlı dosyalar da okunur, tutarsız satır raporlanır", () => {
  const result = parseSalarySheetCsv("Ali Kaya,Depo,Forklift,mavi,emekli,30000\nVeli,Depo,,,,");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].insuranceType, "RETIRED");
  assert.deepEqual(result.skipped, [2]);
});

test("tırnak içindeki ayraç ve çift tırnak korunur", () => {
  assert.deepEqual(splitCsv('"Yılmaz; Ahmet";"35.000,00";"5""li"'), [["Yılmaz; Ahmet", "35.000,00", '5"li']]);
});

test("yaka tipi varsayılan tanım adlarına çevrilir, diğerleri korunur", async () => {
  const { normalizeCollarType } = await import("./salary-sheet-csv");
  assert.equal(normalizeCollarType(" mavi   yaka "), "Mavi Yaka");
  assert.equal(normalizeCollarType("BEYAZ"), "Beyaz Yaka");
  assert.equal(normalizeCollarType("Gri  Yaka"), "Gri Yaka");
  assert.equal(normalizeCollarType(""), "");
});

test("personel şablonundaki maaş tipi sütunu satır bazında okunur", () => {
  const result = parseSalarySheetCsv(personnelCsvTemplate());
  assert.deepEqual(result.rows.map((row) => [row.basis, row.amount]), [["GROSS", 35000], ["NET", 48500]]);
  const netSheet = parseSalarySheetCsv(salarySheetCsvTemplate("Net Maaş"));
  assert.deepEqual(netSheet.rows.map((row) => row.basis), ["NET", "NET"]);
  assert.equal(parseSalarySheetCsv("Ali Kaya,Depo,Forklift,mavi,emekli,30000").rows[0].basis, undefined);
});
