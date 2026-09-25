import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { logoutAdmin } from "@/app/dashboard/logout-action";
import { MacifyLogo } from "@/components/site/macify-logo";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

export function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="dashboard-rail">
        <div className="dashboard-brand">
          <MacifyLogo href="/dashboard" />
          <span>Publishing</span>
        </div>
        <DashboardNavigation />
        <div className="dashboard-rail-footer">
          <span className="dashboard-environment"><i aria-hidden="true" /> Admin workspace</span>
          <Link className="dashboard-site-link" href="/">Open Macify <ArrowUpRight aria-hidden="true" size={15} /></Link>
          <form action={logoutAdmin}><button className="dashboard-site-link dashboard-logout" type="submit">Sign out <LogOut aria-hidden="true" size={15} /></button></form>
        </div>
      </header>
      <div className="dashboard-workspace">
        <main className="dashboard-main" id="main-content">{children}</main>
      </div>
    </div>
  );
}
