import type { Metadata } from "next";
import Link from "next/link";
import { Shuffle } from "lucide-react";
import { PublicShell } from "@/components/public-site";

const description = "Featuring is not available on Macify right now. Check back later.";

export const metadata: Metadata = {
  title: "Featuring is not available yet",
  description,
  robots: { index: false, follow: true },
};

export default function GetFeaturedPage() {
  return (
    <PublicShell>
      <main className="featured-unavailable" id="main-content">
        <div className="featured-unavailable-mark" aria-hidden="true">
          <span />
          <strong>Coming soon</strong>
          <span />
        </div>
        <p className="featured-unavailable-note">A little early for the spotlight.</p>
        <h1>Featuring isn’t available yet.</h1>
        <p className="featured-unavailable-copy">
          We’re still working out how featuring should work on Macify. If you’d like to feature your app, check back again in the future.
        </p>
        <div className="featured-unavailable-actions">
          <Link className="site-action site-action--primary" href="/surprise">Surprise me <Shuffle aria-hidden="true" size={16} /></Link>
        </div>
      </main>
    </PublicShell>
  );
}
