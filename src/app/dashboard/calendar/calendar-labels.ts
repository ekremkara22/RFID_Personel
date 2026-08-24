import {
  CalendarApprovalStatus,
  CalendarCalculationStatus,
  CalendarScopeType,
  EmploymentStatus,
  SpecialDayType,
  WorkDayType,
} from "@/generated/prisma/client";
import { formatMinutes } from "@/lib/work-calendar-rules";

export const weekdayLabels = {
  1: "Pazartesi",
  2: "Sali",
  3: "Carsamba",
  4: "Persembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
} as const;

export const dayTypeLabels: Record<WorkDayType, string> = {
  NORMAL_WORK: "Normal calisma",
  WEEKLY_REST: "Hafta tatili",
  NON_WORKING: "Calisilmayan gun",
  OFFICIAL_HOLIDAY: "Resmi tatil",
  COMPANY_HOLIDAY: "Sirket ozel tatili",
  HALF_WORK: "Yarim calisma",
  EXTRA_WORK: "Ek calisma",
  SPECIAL_WORK: "Ozel calisma",
  LEAVE: "Izinli",
  CONFLICT: "Takvim cakismasi",
};

export const specialDayTypeLabels: Record<SpecialDayType, string> = {
  OFFICIAL_HOLIDAY: "Resmi tatil",
  COMPANY_HOLIDAY: "Sirket ozel tatili",
  ADMINISTRATIVE_HOLIDAY: "Idari tatil",
  HALF_WORK: "Yarim calisma gunu",
  EXTRA_WORK: "Ek calisma gunu",
  DEPARTMENT_HOLIDAY: "Departmana ozel tatil",
  DEPARTMENT_WORK: "Departmana ozel calisma",
  BRANCH_HOLIDAY: "Subeye ozel tatil",
  BRANCH_WORK: "Subeye ozel calisma",
};

export const scopeLabels: Record<CalendarScopeType, string> = {
  COMPANY: "Sirket",
  BRANCH: "Sube",
  DEPARTMENT: "Departman",
  EMPLOYEE: "Personel",
};

export const approvalLabels: Record<CalendarApprovalStatus, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandi",
  REJECTED: "Reddedildi",
};

export const calculationStatusLabels: Record<CalendarCalculationStatus, string> = {
  CALCULATED: "Hesaplandi",
  CONFLICT: "Cakisma",
  MISSING_DEFAULT: "Varsayilan eksik",
  OUT_OF_EMPLOYMENT: "Calisma disi",
};

export const employmentStatusLabels: Record<EmploymentStatus, string> = {
  ACTIVE: "Aktif calisan",
  PASSIVE: "Pasif",
  BEFORE_HIRE: "Ise giris oncesi",
  AFTER_TERMINATION: "Isten ayrilis sonrasi",
};

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(date);
}

export function formatDateInput(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function formatPlannedDuration(minutes: number) {
  return formatMinutes(minutes);
}
