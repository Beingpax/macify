import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/public-site";

const description = "Priority review and a 30-day featured placement for eligible Mac applications on Macify.";
const checkoutUrl = "https://checkout.dodopayments.com/buy/pdt_0NoGuBrnjnGxoxvUzkjoW?quantity=1&redirect_url=https://macify.app%2Fget-featured%2Fthank-you";

export const metadata: Metadata = {
  title: "Get featured",
  description,
  alternates: { canonical: "/get-featured" },
  openGraph: {
    title: "Get featured on Macify",
    description,
    url: "/get-featured",
  },
  robots: { index: false, follow: true },
};

export default function GetFeaturedPage() {
  return (
    <PublicShell>
      <main className="submission-page featured-program-page" id="main-content">
        <div className="submission-shell">
          <header className="submission-hero featured-program-hero">
            <div className="submission-hero-title">
              <p>A little more room in the spotlight</p>
              <h1>Get featured.</h1>
            </div>
            <div className="submission-hero-copy">
              <p>Give your Mac app priority review and, if approved, a clearly labelled place at the top of the directory for 30 days.</p>
            </div>
          </header>

          <section className="featured-program-benefits" aria-label="What featuring includes">
            <div>
              <h2>Priority review</h2>
              <p>Move ahead of the standard queue for an editorial decision.</p>
            </div>
            <div>
              <h2>30 days in the spotlight</h2>
              <p>Your approved app appears at the top of the homepage directory with a featured seal and a paid-placement label. The 30 days start when it goes live.</p>
            </div>
          </section>

          <section className="featured-program-terms" aria-labelledby="featured-program-terms-title">
            <h2 id="featured-program-terms-title">Editorial approval still applies.</h2>
            <p>Payment does not guarantee publication. Every app must meet the <Link href="/editorial-policy">editorial policy</Link>. If an app is declined before placement, the payment is refunded minus non-refundable processing charges.</p>
          </section>

          <section className="submission-cta featured-program-next">
            <div>
              <h2>Ready to get featured?</h2>
              <p>Checkout is handled by Dodo Payments. We’ll contact you within 24 hours about your app’s placement.</p>
            </div>
            <a href={checkoutUrl}>Continue to checkout <ArrowUpRight aria-hidden="true" size={18} /></a>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
