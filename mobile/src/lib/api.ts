import { API_BASE_URL } from "./config";
import type {
  AttendanceResponse,
  LoginResponse,
  MovementType,
  QrTestResponse,
} from "../types";

type AttendancePayload = {
  token: string;
  type: MovementType;
  qrToken?: string;
  latitude?: number;
  longitude?: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Beklenmeyen bir hata oluştu.");
  }

  return data as T;
}

export async function loginEmployee(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<LoginResponse>(response);
}

export async function submitAttendance(payload: AttendancePayload) {
  const response = await fetch(`${API_BASE_URL}/api/mobile/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.token}`,
    },
    body: JSON.stringify({
      type: payload.type,
      qrToken: payload.qrToken,
      latitude: payload.latitude,
      longitude: payload.longitude,
    }),
  });

  return parseResponse<AttendanceResponse>(response);
}

export async function testQrMatch(token: string, qrToken?: string) {
  const response = await fetch(`${API_BASE_URL}/api/mobile/test/qr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      qrToken: qrToken || undefined,
    }),
  });

  return parseResponse<QrTestResponse>(response);
}
