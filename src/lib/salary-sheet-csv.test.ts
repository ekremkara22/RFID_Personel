import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSalarySheetCsv, salarySheetCsvTemplate, splitCsv } from "./salary-sheet-csv";

test("hesaplama şablonu kendi okuyucusuyla hatasız yüklenir", () => {
  const result = parseSalarySheetCsv(salarySheetCsvTemplate("Brüt Maaş"));
  assert.deepEqual(result.skipped, []);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows[0], { name: "Ahmet Yılmaz", department: "Üretim", position: "Operatör", workforceType: "BLUE_COLLAR", insuranceType: "INCENTIVE", amount: 35000 });
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
