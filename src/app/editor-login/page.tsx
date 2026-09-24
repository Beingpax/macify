import "@/styles/editor-login.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/editor-login/login-form";
import { MacifyLogo } from "@/components/site/macify-logo";
import { isAdminAuthenticated, isLocalEditor } from "@/lib/auth/admin-auth";

export const metadata: Metadata = { title: "Editorial sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditorLoginPage() {
  if (!(await isLocalEditor())) redirect("/dashboard");
  if (await isAdminAuthenticated()) redirect("/dashboard");
  return <main className="editor-login-page"><section className="editor-login-card"><MacifyLogo href="/" /><div><h1>Editorial workspace</h1><p>Sign in to manage the Macify directory.</p></div><LoginForm /></section></main>;
}
