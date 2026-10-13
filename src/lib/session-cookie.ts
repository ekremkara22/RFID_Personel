import type { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, signToken, type AuthTokenPayload } from "@/lib/auth";

/** Signs the session token and attaches it with the same cookie policy for login and sign-up. */
export async function attachSessionCookie(request: Request, response: NextResponse, payload: AuthTokenPayload) {
  const token = await signToken(payload);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttpsRequest = request.url.startsWith("https://") || forwardedProto === "https";

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest,
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
