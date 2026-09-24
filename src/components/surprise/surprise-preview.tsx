"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PublicAppIcon } from "@/components/public-app-card";
import type { SurpriseApplication } from "@/lib/surprise-data";
import { pricingLabels } from "@/lib/pricing";

export function SurprisePreview({ application }: { application: SurpriseApplication }) {
  const categoryNames = application.categories.map((category) => category.name).join(", ") || "Not listed";
  const billingLabel = application.billingType === "subscription" ? "Subscription"
    : application.billingType === "one_time" ? "One-time purchase" : null;

  return (
    <div className="surprise-preview-shell">
      <aside aria-label={`${application.name} details`} className="surprise-preview">
        <div className="surprise-preview-identity">
          <div className="surprise-preview-copy">
            <h2>{application.name}</h2>
            <p>{application.tagline}</p>
          </div>
          <span className="surprise-preview-icon">
            <PublicAppIcon app={application} decorative size={56} />
          </span>
        </div>

        <dl className="surprise-preview-facts">
          <div><dt>Category</dt><dd>{categoryNames}</dd></div>
          <div>
            <dt>Pricing</dt>
            <dd>
              {pricingLabels[application.pricingType]}
              {application.pricingDetails && <small>{application.pricingDetails}</small>}
            </dd>
          </div>
          {billingLabel && <div><dt>Billing</dt><dd>{billingLabel}</dd></div>}
          {application.sourceType === "open_source" && (
            <div><dt>Source</dt><dd data-open-source="true">Open source</dd></div>
          )}
        </dl>

        <div className="surprise-preview-actions">
          <Link aria-label={`Details for ${application.name}`} href={`/apps/${application.slug}`} prefetch={false}>
            Details <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <a
            aria-label={`Visit ${application.name} site (opens in a new tab)`}
            href={application.websiteUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Site <ArrowUpRight aria-hidden="true" size={16} />
          </a>
        </div>
      </aside>
    </div>
  );
}
