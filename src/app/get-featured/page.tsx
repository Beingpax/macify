import type { Metadata } from "next";
import Link from "next/link";
import { Shuffle } from "lucide-react";
import { PublicContentHero, PublicContentPage } from "@/components/site/public-content-page";

const description = "Featuring is not available on Macify right now. Check back later.";

export const metadata: Metadata = {
  title: "Featuring is not available yet",
  description,
  robots: { index: false, follow: true },
};

export default function GetFeaturedPage() {
  return (
    <PublicContentPage className="featured-unavailable-page">
      <PublicContentHero kicker="A little early for the spotlight." title="Featuring isn’t available yet.">
        <p>We’re still working out how featuring should work on Macify. If you’d like to feature your app, check back again in the future.</p>
        <div className="featured-unavailable-actions">
          <Link className="site-action site-action--primary" href="/surprise">Surprise me <Shuffle aria-hidden="true" size={16} /></Link>
        </div>
      </PublicContentHero>
    </PublicContentPage>
  );
}
