"use server";

import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/auth/admin-auth";

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/editor-login");
}
