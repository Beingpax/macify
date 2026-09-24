import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { PublicShell } from "@/components/public-site";

const contributionGuideUrl = "https://github.com/Beingpax/macify/blob/main/CONTRIBUTING.md";

export const metadata: Metadata = {
  title: "Payment complete",
  description: "What happens after your Macify featured placement payment.",
  alternates: { canonical: "/get-featured/thank-you" },
  robots: { index: false, follow: true },
};

export default function FeaturedPlacementThankYouPage() {
  return (
    <PublicShell>
      <main className="featured-thanks" id="main-content">
        <div className="featured-thanks-shell">
          <div aria-hidden="true" className="featured-thanks-mark">
            <Check size={30} strokeWidth={2.5} />
          </div>

          <header className="featured-thanks-intro">
            <p className="featured-thanks-kicker">Payment complete</p>
            <h1>You’re all set.</h1>
            <p>
              We’ll contact you within 24 hours about your app’s placement.
            </p>
          </header>

          <section aria-labelledby="featured-thanks-next-title" className="featured-thanks-next">
            <h2 id="featured-thanks-next-title">Is your app new to the directory?</h2>
            <p>
              If your app isn’t listed, our{" "}
              <Link href="/submit">submission guidelines</Link> explain how to propose it.
            </p>
            <div className="featured-thanks-actions">
              <a className="featured-thanks-primary" href={contributionGuideUrl} rel="noreferrer" target="_blank">
                Submit an app <ArrowUpRight aria-hidden="true" size={18} />
              </a>
            </div>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
