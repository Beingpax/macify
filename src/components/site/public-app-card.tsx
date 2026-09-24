import Image from "next/image";
import type { BillingType, PricingType } from "@/lib/shared/pricing";

export type PublicAppSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  pricingType: PricingType;
  billingType: BillingType;
  pricingDetails: string | null;
  isFeatured: boolean;
  isEditorsPick: boolean;
  icon: { storageKey: string; altText: string | null } | null;
};

export function mediaUrl(storageKey: string, scope: "public" | "dashboard" = "public") {
  return `${scope === "dashboard" ? "/dashboard" : ""}/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

type AppIconSize = 44 | 50 | 56 | 58 | 60 | 66 | 76 | 96;

export function PublicAppIcon({
  app,
  decorative = false,
  iconUrl,
  mediaScope = "public",
  loading,
  size = 56,
  // Fixed icons use Next's compact density srcset; responsive callers opt in.
  sizes,
}: {
  app: Pick<PublicAppSummary, "name" | "icon">;
  decorative?: boolean;
  iconUrl?: string | null;
  mediaScope?: "public" | "dashboard";
  loading?: "eager" | "lazy";
  size?: AppIconSize;
  sizes?: string;
}) {
  const className = `public-app-icon public-app-icon-${size}`;
  return app.icon ? (
    <Image
      alt={decorative ? "" : (app.icon.altText ?? `${app.name} icon`)}
      className={className}
      height={size}
      loading={loading ?? "lazy"}
      quality={88}
      sizes={sizes}
      src={iconUrl ?? mediaUrl(app.icon.storageKey, mediaScope)}
      unoptimized={mediaScope === "dashboard" || Boolean(iconUrl)}
      width={size}
    />
  ) : (
    <span className={`${className} public-app-icon-fallback`} aria-hidden="true">
      {app.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
