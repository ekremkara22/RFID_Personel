import test from "node:test";
import assert from "node:assert/strict";
import type { AttendanceLog, Employee } from "@/generated/prisma/client";
import { buildAttendanceReviewCases } from "@/lib/attendance-review";

const employee = {
  id: 7,
  firstName: "Test",
  lastName: "Personel",
  companyId: 3,
  department: "Üretim",
  branch: "Merkez",
} as Employee;

function movement(id: number, type: AttendanceLog["type"], scannedAt: string, receivedAt?: string) {
  return {
    id,
    employeeId: employee.id,
    employee,
    deviceId: 1,
    clientEventId: `event-${id}`,
    scannedAt: new Date(scannedAt),
    receivedAt: receivedAt ? new Date(receivedAt) : null,
    type,
    rfidCardId: "TEST",
  } as AttendanceLog & { employee: Employee };
}

test("gecmis gunde cikisi olmayan hareketi incelemeye alir", () => {
  const cases = buildAttendanceReviewCases([
    movement(1, "ENTRY", "2026-09-20T05:00:00Z", "2026-09-20T05:00:05Z"),
  ], "2026-09-21");
  assert.equal(cases.length, 1);
  assert.ok(cases[0].issueLabels.includes("Eksik çıkış"));
});

test("bes dakikadan gec ulasan kaydi gecikmeli olarak isaretler", () => {
  const cases = buildAttendanceReviewCases([
    movement(2, "ENTRY", "2026-09-21T05:00:00Z", "2026-09-21T05:06:00Z"),
  ], "2026-09-21");
  assert.equal(cases.length, 1);
  assert.deepEqual(cases[0].delayedLogIds, [2]);
  assert.ok(cases[0].issueLabels.includes("Gecikmeli kayıt"));
});
