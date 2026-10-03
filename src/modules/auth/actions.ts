"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";


export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  revalidatePath("/login");
}
