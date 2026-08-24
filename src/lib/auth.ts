import { JWTPayload, SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "checkinqr_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-default-key-for-dev-only",
);

export type AuthTokenPayload = JWTPayload & {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string | null;
  actorType?: "admin" | "employee";
};

export async function signToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}
