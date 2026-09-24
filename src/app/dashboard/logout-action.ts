"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, isLocalEditor } from "@/lib/auth/admin-auth";

export async function logoutAdmin() {
  if (!(await isLocalEditor())) redirect("/cdn-cgi/access/logout");
  await clearAdminSession();
  redirect("/editor-login");
}
