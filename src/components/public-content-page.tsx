import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/public-site";

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PublicContentPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PublicShell>
      <main className={classNames("public-content-page", className)} id="main-content">
        <div className="public-content-shell">{children}</div>
      </main>
    </PublicShell>
  );
}

export function PublicContentHero({
  kicker,
  title,
  children,
  className,
}: {
  kicker?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={classNames("public-content-hero", className)}>
      <div className="public-content-hero-title">
        {kicker ? <p>{kicker}</p> : null}
        <h1>{title}</h1>
      </div>
      <div className="public-content-hero-copy">{children}</div>
    </header>
  );
}

export function PublicContentSection({
  title,
  children,
  description,
  id,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={classNames("public-content-section", className)} id={id}>
      <div className="public-content-section-heading">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function PublicContentFeature({
  title,
  description,
  asideTitle,
  children,
  id,
  className,
}: {
  title: ReactNode;
  description: ReactNode;
  asideTitle: string;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={classNames("public-content-feature", className)} id={id}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="public-content-feature-aside">
        <h3>{asideTitle}</h3>
        {children}
      </div>
    </section>
  );
}

export function PublicContentCallToAction({
  title,
  description,
  href,
  label,
  id,
  external = false,
  newTab = false,
}: {
  title: string;
  description: ReactNode;
  href: string;
  label: string;
  id?: string;
  external?: boolean;
  newTab?: boolean;
}) {
  const content = <>{label} <ArrowUpRight aria-hidden="true" size={18} /></>;

  return (
    <section className="public-content-cta" id={id}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {external ? (
        <a
          aria-label={newTab ? `${label} (opens in a new tab)` : undefined}
          className="site-action site-action--primary"
          href={href}
          rel={newTab ? "noreferrer" : undefined}
          target={newTab ? "_blank" : undefined}
        >
          {content}
        </a>
      ) : (
        <Link className="site-action site-action--primary" href={href}>{content}</Link>
      )}
    </section>
  );
}
