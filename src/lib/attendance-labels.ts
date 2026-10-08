import type { AttendanceType } from "@/generated/prisma/client";

export const ATTENDANCE_TYPE_LABELS: Record<AttendanceType, string> = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola Başlangıç",
  BREAK_END: "Mola Bitiş",
  MEAL_START: "Yemek Çıkış",
  MEAL_END: "Yemek Giriş",
};
