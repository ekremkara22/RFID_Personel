export type MovementType =
  | "ENTRY"
  | "EXIT"
  | "BREAK_START"
  | "BREAK_END"
  | "MEAL_START"
  | "MEAL_END";

export type EmployeeProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  companyName: string;
};

export type LoginResponse = {
  token: string;
  employee: EmployeeProfile;
  movementTypes: MovementType[];
};

export type AttendanceResponse = {
  success: boolean;
  logId: string;
  qrRefreshed?: boolean;
  nextQrToken?: string;
  nextQrExpiresAt?: string;
};

export type QrTestResponse = {
  success: boolean;
  deviceName: string;
  testedQrToken: string;
  qrRefreshed: boolean;
  nextQrToken: string;
  nextQrExpiresAt: string;
};
