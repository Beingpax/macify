"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateAdmin, createAdminSession, isLocalEditor, loginRateLimit } from "@/lib/auth/admin-auth";

export type LoginState = { error?: string };

export async function loginAdmin(_state: LoginState, formData: FormData): Promise<LoginState> {
  if (!(await isLocalEditor())) redirect("/dashboard");
  const email = String(formData.get("email") ?? "").slice(0, 320);
  const password = String(formData.get("password") ?? "").slice(0, 1024);
  const limit = await loginRateLimit(await headers());
  if (limit.blocked) return { error: "Too many attempts. Wait 15 minutes and try again." };
  if (!(await authenticateAdmin(email, password))) {
    await limit.recordFailure();
    return { error: "The email or password is incorrect." };
  }
  await limit.clear();
  await createAdminSession();
  redirect("/dashboard");
}
