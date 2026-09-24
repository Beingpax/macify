import type { Metadata } from "next";
import Link from "next/link";
import {
  PublicContentCallToAction,
  PublicContentHero,
  PublicContentPage,
  PublicContentSection,
} from "@/components/public-content-page";

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
    <PublicContentPage className="featured-program-page">
      <PublicContentHero className="featured-program-hero" kicker="A little more room in the spotlight" title="Get featured.">
        <p>Give your Mac app priority review and, if approved, a clearly labelled place at the top of the directory for 30 days.</p>
      </PublicContentHero>

      <PublicContentSection id="priority-review" title="Priority review">
        <p>Move ahead of the standard queue for an editorial decision.</p>
      </PublicContentSection>

      <PublicContentSection id="placement" title="30 days in the spotlight">
        <p>Your approved app appears at the top of the homepage directory with a featured seal and a paid-placement label. The 30 days start when it goes live.</p>
      </PublicContentSection>

      <PublicContentSection id="terms" title="Editorial approval still applies.">
        <p>Payment does not guarantee publication. Every app must meet the <Link className="editorial-inline-link" href="/editorial-policy">editorial policy</Link>. If an app is declined before placement, the payment is refunded minus non-refundable processing charges.</p>
      </PublicContentSection>

      <PublicContentCallToAction
        description="Checkout is handled by Dodo Payments. We’ll contact you within 24 hours about your app’s placement."
        external
        href={checkoutUrl}
        label="Continue to checkout"
        title="Ready to get featured?"
      />
    </PublicContentPage>
  );
}
