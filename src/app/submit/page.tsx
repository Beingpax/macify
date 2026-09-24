import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import {
  PublicContentCallToAction,
  PublicContentFeature,
  PublicContentHero,
  PublicContentPage,
  PublicContentSection,
} from "@/components/public-content-page";

const appSubmissionUrl = "https://github.com/Beingpax/macify/new/main/catalog/apps";

export const metadata: Metadata = {
  title: "Submit an app",
  description: "Eligibility and editorial standards for proposing an application to Macify through GitHub.",
  alternates: { canonical: "/submit" },
  openGraph: {
    title: "Submit an app to Macify",
    description: "Read the eligibility and editorial requirements before proposing a Mac application.",
    url: "/submit",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Submit an app to Macify",
  url: "https://macify.app/submit",
  description: "Eligibility and editorial standards for proposing an application to Macify through GitHub.",
  isPartOf: { "@id": "https://macify.app/#website" },
};

const eligibilityRequirements = [
  "Publicly available for at least 30 days.",
  "Built for macOS or offers a meaningful, well-supported Mac experience.",
  "Works reliably on every macOS version the developer claims to support.",
  "Actively maintained, with no unresolved critical problems.",
  "Has current public information about pricing, privacy, support, and downloads.",
];

export default function SubmitApplicationPage() {
  return (
    <PublicContentPage className="submit-application-page">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />

      <PublicContentHero kicker="For developers and thoughtful recommendations" title="Submit an app.">
        <p>Built a Mac app or know one that belongs here? Check the standards below, then propose it through GitHub.</p>
        <ul aria-label="Submission facts" className="submission-facts">
          <li><strong>30 days</strong><span>minimum public availability</span></li>
          <li><strong>7 days</strong><span>for initial review</span></li>
          <li><strong>GitHub</strong><span>submission method</span></li>
        </ul>
      </PublicContentHero>

      <PublicContentSection description="Every proposed app must meet these requirements." id="eligibility" title="The minimum bar">
        <ul className="submission-requirements">
          {eligibilityRequirements.map((requirement) => (
            <li key={requirement}>
              <span aria-hidden="true"><Check size={18} strokeWidth={2.5} /></span>
              {requirement}
            </li>
          ))}
        </ul>
      </PublicContentSection>

      <PublicContentFeature
        asideTitle="We do not accept"
        description="Macify looks for a clear purpose, reliable behavior, thoughtful interaction design, and a coherent interface."
        id="quality"
        title={<><span>Original, useful,</span><span>and maintained.</span></>}
      >
        <ul>
          <li>Low-effort, hastily coded, or generic applications.</li>
          <li>Close copies of an established product without meaningful original work.</li>
          <li>Unfinished interfaces, copied templates, or unreliable core features.</li>
          <li>Misleading claims, hidden pricing, malware, impersonation, or rights violations.</li>
        </ul>
      </PublicContentFeature>

      <PublicContentSection id="review" title="Review and final decision">
        <p>Initial review may take up to seven days. Macify may request corrections or stronger evidence. The site owner makes the final decision and may accept, edit, defer, or decline a submission; publication is not guaranteed.</p>
        <Link className="editorial-inline-link" href="/editorial-policy">Read the editorial policy <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </PublicContentSection>

      <PublicContentCallToAction
        description="Add one application file on GitHub, then open it as a pull request for editorial review."
        external
        href={appSubmissionUrl}
        id="submit-through-github"
        label="Submit app via pull request"
        newTab
        title="Ready to submit your app?"
      />

      <aside className="submit-featured-path" aria-labelledby="submission-featured-title">
        <div>
          <h2 id="submission-featured-title">Want a featured placement?</h2>
          <p>We’re still working out how featuring should work on Macify.</p>
        </div>
        <Link className="site-action site-action--primary" href="/get-featured">About featuring <ArrowUpRight aria-hidden="true" size={18} /></Link>
      </aside>
    </PublicContentPage>
  );
}
