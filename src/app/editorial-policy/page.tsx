import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  PublicContentCallToAction,
  PublicContentFeature,
  PublicContentHero,
  PublicContentPage,
  PublicContentSection,
} from "@/components/site/public-content-page";

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "How Macify selects, researches, and maintains application listings.",
  alternates: { canonical: "/editorial-policy" },
  openGraph: {
    title: "Editorial policy | Macify",
    description: "How Macify selects, researches, and maintains application listings.",
    url: "/editorial-policy",
  },
};

const selectionStandards = [
  "A useful application built for macOS or offering a meaningful, well-supported Mac experience.",
  "A clear purpose, reliable behavior, thoughtful design, and active maintenance.",
  "Publicly available for at least 30 days, with no unresolved critical problems.",
  "A trustworthy source and current public information about pricing, privacy, support, and downloads.",
];

export default function EditorialPolicyPage() {
  return (
    <PublicContentPage className="editorial-page">
      <PublicContentHero className="editorial-hero" kicker="Our standard for every listing" title="Editorial policy.">
        <p>Macify reviews every application for usefulness, reliability, originality, and maintenance before deciding whether to publish it.</p>
        <small>Last updated September 23, 2026</small>
      </PublicContentHero>

      <PublicContentSection
        description="Applications need to meet the minimum bar and give Mac users a clear reason to consider them."
        id="selection"
        title="What we include"
      >
        <ul className="submission-requirements">
          {selectionStandards.map((standard) => (
            <li key={standard}>
              <span aria-hidden="true"><Check size={18} strokeWidth={2.5} /></span>
              {standard}
            </li>
          ))}
        </ul>
      </PublicContentSection>

      <PublicContentFeature
        asideTitle="We may decline or remove"
        description="We assess usefulness, reliability, trustworthiness, originality, and maintenance when an application is submitted and as it changes."
        id="quality"
        title="Quality is a continuing requirement."
      >
        <ul>
          <li>Unfinished, generic, or closely copied applications without meaningful original work.</li>
          <li>Applications with misleading claims, hidden pricing, unsafe behavior, or insufficient support.</li>
          <li>Applications that no longer work reliably on the macOS versions they claim to support.</li>
        </ul>
        <p>Macify may accept, decline, edit, defer, or remove a listing. Submission does not guarantee publication.</p>
      </PublicContentFeature>

      <PublicContentSection id="research" title="How we research and write">
        <p>We use official websites, documentation, release notes, pricing pages, public repositories, and credible independent sources. Facts that change often, including price, compatibility, licensing, privacy, and availability, are checked against current sources.</p>
        <p>Listings explain what an application does, where it fits, and important tradeoffs in Macify’s own words. A listing is a researched description, not a hands-on review unless it explicitly says otherwise.</p>
      </PublicContentSection>

      <PublicContentSection id="meaning" title="What a listing means">
        <p>Inclusion means Macify considers the application useful enough to feature. It is not a warranty, security certification, or promise that the application will suit every person or workflow. Check the developer’s current terms, privacy information, system requirements, and pricing before relying on an application.</p>
        <p>Product names, trademarks, and artwork belong to their respective owners. Their appearance on Macify does not imply that the developer endorses or sponsors Macify.</p>
        <p>Macify is an independent publication and is not affiliated with, endorsed by, or sponsored by Apple Inc. Mac and macOS are trademarks of Apple Inc.</p>
      </PublicContentSection>

      <PublicContentSection id="featured" title="Featured placement and disclosure">
        <p>Featured applications appear at the top of the homepage directory and carry a gold check seal.</p>
        <p>Paid featured placements are not currently available.</p>
      </PublicContentSection>

      <PublicContentSection id="affiliate-disclosure" title="Affiliate disclosure">
        <p>Some links on Macify may be affiliate links. If you make a purchase through one of these links, Macify may earn a commission at no additional cost to you.</p>
      </PublicContentSection>

      <PublicContentSection className="editorial-corrections" id="corrections" title="Corrections and concerns">
        <p>To report outdated information or a safety, copyright, trademark, or availability concern, share the app name, the issue, and a current source through the <a href="https://github.com/Beingpax/macify">Macify GitHub repository</a>. Macify reviews credible reports and decides whether to update a listing. For site data and analytics, read the <Link href="/privacy">privacy notice</Link>.</p>
      </PublicContentSection>

      <PublicContentCallToAction
        description="Read the eligibility and submission requirements before opening a proposal."
        href="/submit"
        label="Submit an app"
        title="Have an app to suggest?"
      />
    </PublicContentPage>
  );
}
