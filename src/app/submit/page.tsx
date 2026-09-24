import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { PublicShell } from "@/components/public-site";

const contributionGuideUrl = "https://github.com/Beingpax/macify/blob/main/CONTRIBUTING.md";

export const metadata: Metadata = {
  title: "Submit an app",
  description: "Eligibility, editorial standards, and the GitHub process for proposing an application to Macify.",
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
  description: "Eligibility, editorial standards, and the GitHub process for proposing an application to Macify.",
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
    <PublicShell>
      <main className="submission-page submit-application-page" id="main-content">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />

        <div className="submission-shell">
          <header className="submission-hero">
            <div className="submission-hero-title">
              <p>For developers and thoughtful recommendations</p>
              <h1>Submit an app.</h1>
            </div>
            <div className="submission-hero-copy">
              <p>Built a Mac app or know one that belongs here? Check the standards below, then propose it through GitHub.</p>
              <ul aria-label="Submission facts" className="submission-facts">
                <li><strong>30 days</strong><span>minimum public availability</span></li>
                <li><strong>7 days</strong><span>for initial review</span></li>
                <li><strong>GitHub</strong><span>submission method</span></li>
              </ul>
            </div>
          </header>

          <section className="submission-eligibility" id="eligibility">
            <div className="submission-section-heading">
              <h2>The minimum bar</h2>
              <p>Every proposed app must meet these requirements.</p>
            </div>
            <ul className="submission-requirements">
              {eligibilityRequirements.map((requirement) => (
                <li key={requirement}>
                  <span aria-hidden="true"><Check size={18} strokeWidth={2.5} /></span>
                  {requirement}
                </li>
              ))}
            </ul>
          </section>

          <section className="submission-quality" id="quality">
            <div>
              <h2>Original, useful, and maintained.</h2>
              <p>Macify looks for a clear purpose, reliable behavior, thoughtful interaction design, and a coherent interface.</p>
            </div>
            <div className="submission-quality-rules">
              <h3>We do not accept</h3>
              <ul>
                <li>Low-effort, hastily coded, or generic applications.</li>
                <li>Close copies of an established product without meaningful original work.</li>
                <li>Unfinished interfaces, copied templates, or unreliable core features.</li>
                <li>Misleading claims, hidden pricing, malware, impersonation, or rights violations.</li>
              </ul>
            </div>
          </section>

          <section className="submission-process" id="process">
            <div className="submission-section-heading">
              <h2>How submission works</h2>
              <p>Prepare one accurate app proposal before opening a pull request.</p>
            </div>
            <ol>
              <li>
                <h3>Check the directory</h3>
                <p>Make sure the application is not already listed and meets the minimum bar above.</p>
              </li>
              <li>
                <h3>Prepare accurate sources</h3>
                <p>Gather the official website, pricing, privacy and support details, download link, and artwork.</p>
              </li>
              <li>
                <h3>Open a GitHub proposal</h3>
                <p>Follow the repository guide, validate the application file, and submit one application per pull request.</p>
              </li>
            </ol>
          </section>

          <section className="submission-decision" id="review">
            <h2>Review and final decision</h2>
            <div>
              <p>Initial review may take up to seven days. Macify may request corrections or stronger evidence. The site owner makes the final decision and may accept, edit, defer, or decline a submission; publication is not guaranteed.</p>
              <Link href="/editorial-policy">Read the editorial policy <ArrowUpRight aria-hidden="true" size={16} /></Link>
            </div>
          </section>

          <section className="submission-cta" id="submit-through-github">
            <div>
              <h2>Ready to propose an app?</h2>
              <p>Use the GitHub guide to prepare and send your app proposal.</p>
            </div>
            <a
              aria-label="Read the GitHub submission guide (opens in a new tab)"
              href={contributionGuideUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open the submission guide <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          </section>

          <aside className="submit-featured-path" aria-labelledby="submission-featured-title">
            <div>
              <h2 id="submission-featured-title">Want a featured placement?</h2>
              <p>Priority review and 30 days at the top of the directory are available for eligible apps.</p>
            </div>
            <Link href="/get-featured">Get featured <ArrowUpRight aria-hidden="true" size={18} /></Link>
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
