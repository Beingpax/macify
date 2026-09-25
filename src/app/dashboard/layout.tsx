import "@/styles/dashboard/shell.css";
import "@/styles/dashboard/shared-content.css";
import "@/styles/dashboard/catalogue.css";
import "@/styles/dashboard/applications.css";
import "@/styles/dashboard/media.css";
import "@/styles/dashboard/responsive.css";
import "@/styles/dashboard/container-responsive.css";
import "@/styles/dashboard/visual-system.css";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth/admin-auth";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <DashboardShell>{children}</DashboardShell>;
}
