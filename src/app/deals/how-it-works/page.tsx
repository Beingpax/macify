import type { Metadata } from "next";
import {
  PublicContentHero,
  PublicContentPage,
} from "@/components/site/public-content-page";

const description = "Macify finds Mac apps worth buying and works with their developers to bring readers discounts.";

export const metadata: Metadata = {
  title: "How Macify deals work",
  description,
  alternates: { canonical: "/deals/how-it-works" },
  openGraph: {
    title: "How Macify deals work",
    description,
    url: "/deals/how-it-works",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "How Macify deals work",
  url: "https://macify.app/deals/how-it-works",
  description,
  isPartOf: { "@id": "https://macify.app/#website" },
};

export default function HowDealsWorkPage() {
  return (
    <PublicContentPage className="deals-how-page">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <PublicContentHero title="How Macify deals work.">
        <p>We look for Mac apps worth buying at full price, then work with their developers to bring you a better deal.</p>
      </PublicContentHero>

      <article className="deals-how-copy">
        <p>We choose apps we’d happily recommend at their regular price. We work with their developers to negotiate discounts for Macify readers. Some offers require a code or are available only for a limited time.</p>
        <p>You buy directly from the developer; Macify doesn’t take payment. Check the final price, code requirements, and terms on the developer’s website before buying. Offers can change or end, so the price shown on Macify may no longer be current.</p>
        <p className="deals-how-disclaimer">Some links may be affiliate links. If you buy through one, Macify may earn a commission at no extra cost to you.</p>
      </article>
    </PublicContentPage>
  );
}
