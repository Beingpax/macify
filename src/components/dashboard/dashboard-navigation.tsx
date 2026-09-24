"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppWindow, GitPullRequest, Image as ImageIcon, TicketPercent } from "lucide-react";
import { cn } from "@/lib/shared/utils";

const navigation = [
  { id: "applications", label: "Applications", description: "Published app listings", icon: AppWindow, href: "/dashboard", tone: "blue" },
  { id: "catalogue", label: "App queue", description: "Review application updates", icon: GitPullRequest, href: "/dashboard/catalogue", tone: "mint" },
  { id: "deals", label: "Deal queue", description: "Review deal updates", icon: TicketPercent, href: "/dashboard/deals", tone: "orange" },
  { id: "media", label: "Media", description: "Inspect synchronized artwork", icon: ImageIcon, href: "/dashboard/media", tone: "lilac" },
] as const;

export function DashboardNavigation() {
  const pathname = usePathname();
  const active = navigation.find(({ id, href }) => id !== "applications" && (pathname === href || pathname.startsWith(`${href}/`)))?.id ?? "applications";

  return (
    <nav className="dashboard-navigation" aria-label="Dashboard navigation">
      {navigation.map(({ id, label, description, icon: Icon, href, tone }) => (
        <Link aria-current={active === id ? "page" : undefined} className={cn("dashboard-nav-link", active === id && "dashboard-nav-active")} data-tone={tone} href={href} prefetch={id === "media" ? undefined : true} key={id}>
          <span className="dashboard-nav-icon"><Icon aria-hidden="true" size={17} strokeWidth={1.8} /></span>
          <span className="dashboard-nav-copy"><strong>{label}</strong><small>{description}</small></span>
        </Link>
      ))}
    </nav>
  );
}
