import type { AttendanceTrackingMode, AttendanceType, BreakDeductionMode } from "@/generated/prisma/client";

export const ATTENDANCE_TYPE_LABELS: Record<AttendanceType, string> = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola Başlangıç",
  BREAK_END: "Mola Bitiş",
  MEAL_START: "Yemek Çıkış",
  MEAL_END: "Yemek Giriş",
  INTERMEDIATE: "Ara Okutma",
};

export const ATTENDANCE_TRACKING_MODE_LABELS: Record<AttendanceTrackingMode, string> = {
  BREAK_TRACKING: "Açık: ara okutmalar mola sayılır",
  ENTRY_EXIT_ONLY: "Kapalı: yalnız ilk giriş ve son çıkış",
};

export const BREAK_DEDUCTION_MODE_LABELS: Record<BreakDeductionMode, string> = {
  PLANNED: "Yalnız planlanan mola düşülür",
  PLANNED_AND_EXCESS: "Planlanan mola ve aşan süre düşülür",
};

export const ATTENDANCE_TRACKING_MODE_OPTIONS = Object.keys(ATTENDANCE_TRACKING_MODE_LABELS) as AttendanceTrackingMode[];
export const BREAK_DEDUCTION_MODE_OPTIONS = Object.keys(BREAK_DEDUCTION_MODE_LABELS) as BreakDeductionMode[];
