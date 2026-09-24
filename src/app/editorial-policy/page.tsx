import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { PublicShell } from "@/components/public-site";

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
    <PublicShell>
      <main className="submission-page editorial-page" id="main-content">
        <div className="submission-shell">
          <header className="submission-hero editorial-hero">
            <div className="submission-hero-title">
              <p>Our standard for every listing</p>
              <h1>Editorial policy.</h1>
            </div>
            <div className="submission-hero-copy">
              <p>Macify reviews every application for usefulness, reliability, originality, and maintenance before deciding whether to publish it.</p>
              <small>Last updated September 23, 2026</small>
            </div>
          </header>

          <section className="submission-eligibility" id="selection">
            <div className="submission-section-heading">
              <h2>What we include</h2>
              <p>Applications need to meet the minimum bar and give Mac users a clear reason to consider them.</p>
            </div>
            <ul className="submission-requirements">
              {selectionStandards.map((standard) => (
                <li key={standard}>
                  <span aria-hidden="true"><Check size={18} strokeWidth={2.5} /></span>
                  {standard}
                </li>
              ))}
            </ul>
          </section>

          <section className="submission-quality" id="quality">
            <div>
              <h2>Quality is a continuing requirement.</h2>
              <p>We assess usefulness, reliability, trustworthiness, originality, and maintenance when an application is submitted and as it changes.</p>
            </div>
            <div className="submission-quality-rules">
              <h3>We may decline or remove</h3>
              <ul>
                <li>Unfinished, generic, or closely copied applications without meaningful original work.</li>
                <li>Applications with misleading claims, hidden pricing, unsafe behavior, or insufficient support.</li>
                <li>Applications that no longer work reliably on the macOS versions they claim to support.</li>
              </ul>
              <p>Macify may accept, decline, edit, defer, or remove a listing. Submission does not guarantee publication.</p>
            </div>
          </section>

          <section className="editorial-content-section" id="research">
            <h2>How we research and write</h2>
            <div>
              <p>We use official websites, documentation, release notes, pricing pages, public repositories, and credible independent sources. Facts that change often, including price, compatibility, licensing, privacy, and availability, are checked against current sources.</p>
              <p>Listings explain what an application does, where it fits, and important tradeoffs in Macify’s own words. A listing is a researched description, not a hands-on review unless it explicitly says otherwise.</p>
            </div>
          </section>

          <section className="editorial-content-section" id="meaning">
            <h2>What a listing means</h2>
            <div>
              <p>Inclusion means Macify considers the application useful enough to feature. It is not a warranty, security certification, or promise that the application will suit every person or workflow. Check the developer’s current terms, privacy information, system requirements, and pricing before relying on an application.</p>
              <p>Product names, trademarks, and artwork belong to their respective owners. Their appearance on Macify does not imply that the developer endorses or sponsors Macify.</p>
              <p>Macify is an independent publication and is not affiliated with, endorsed by, or sponsored by Apple Inc. Mac and macOS are trademarks of Apple Inc.</p>
            </div>
          </section>

          <section className="editorial-content-section" id="featured">
            <h2>Featured placement and disclosure</h2>
            <div>
              <p>Featured applications appear at the top of the homepage directory and carry a gold check seal.</p>
              <p>Paid placements are labelled separately from editorial selections.</p>
            </div>
          </section>

          <section className="editorial-content-section" id="affiliate-disclosure">
            <h2>Affiliate disclosure</h2>
            <div>
              <p>Some links on Macify may be affiliate links. If you make a purchase through one of these links, Macify may earn a commission at no additional cost to you.</p>
            </div>
          </section>

          <section className="submission-decision editorial-corrections" id="corrections">
            <h2>Corrections and concerns</h2>
            <div>
              <p>To report outdated information or a safety, copyright, trademark, or availability concern, share the app name, the issue, and a current source through the <a href="https://github.com/Beingpax/macify">Macify GitHub repository</a>. Macify reviews credible reports and decides whether to update a listing. For site data and analytics, read the <Link href="/privacy">privacy notice</Link>.</p>
            </div>
          </section>

          <section className="submission-cta">
            <div>
              <h2>Have an app to suggest?</h2>
              <p>Read the eligibility and submission requirements before opening a proposal.</p>
            </div>
            <Link href="/submit">Submit an app <ArrowUpRight aria-hidden="true" size={18} /></Link>
          </section>

        </div>
      </main>
    </PublicShell>
  );
}
