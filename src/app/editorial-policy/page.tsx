import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "How Macify selects, researches, and maintains application listings.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <PolicyLayout
      title="Editorial policy"
      updatedAt="September 23, 2026"
      description="How applications earn and keep a place in the Macify directory."
    >
      <section id="selection">
        <h2>What we include</h2>
        <p>Macify features useful software built for macOS or offering a meaningful Mac experience. We look for a clear purpose, a trustworthy source, understandable pricing, and enough reliable information to explain the application properly.</p>
        <p>Every submission is subject to editorial review before publication.</p>
      </section>
      <section id="quality">
        <h2>Quality and editorial discretion</h2>
        <p>Applications are evaluated for usefulness, reliability, trustworthiness, and maintenance.</p>
        <p>We may decline or remove applications that are unfinished, misleading, unsafe, or insufficiently supported. Applications that no longer work reliably on the macOS versions they claim to support may also be excluded.</p>
        <p>Macify retains final editorial discretion to accept, decline, edit, or remove any listing. Submission does not guarantee inclusion.</p>
      </section>
      <section id="research">
        <h2>How we research and write</h2>
        <p>We use official websites, documentation, release notes, pricing pages, public repositories, and credible independent sources. Facts that change often, including price, compatibility, licensing, privacy, and availability, are checked against current sources.</p>
        <p>Listings explain what an application does, where it fits, and any important tradeoffs in Macify’s own words. A listing is a researched description, not a hands-on review unless it explicitly says otherwise.</p>
      </section>
      <section id="meaning">
        <h2>What a listing means</h2>
        <p>Inclusion means Macify considers the application useful enough to feature. It is not a warranty, security certification, or promise that the application will suit every person or workflow. Check the developer’s current terms, privacy information, system requirements, and pricing before relying on an application.</p>
        <p>Product names, trademarks, and artwork belong to their respective owners. Their appearance on Macify does not imply that the developer endorses or sponsors Macify.</p>
        <p>Macify is an independent publication and is not affiliated with, endorsed by, or sponsored by Apple Inc. Mac and macOS are trademarks of Apple Inc.</p>
      </section>
      <section id="featured">
        <h2>Featured placements and disclosures</h2>
        <p>Featured applications appear at the top of every homepage directory view and are marked with a gold check seal. Hot places Editor’s Picks immediately after Featured applications. Trending and Latest do not prioritize Editor’s Picks, so their remaining applications stay in measured or chronological order.</p>
        <p>Paid placements and sponsorships will be labelled separately from editorial selections.</p>
      </section>
      <section id="affiliate-disclosure">
        <h2>Affiliate disclosure</h2>
        <p>Some links on Macify may be affiliate links. If you make a purchase through one of these links, Macify may earn a commission at no additional cost to you.</p>
      </section>
      <section id="corrections">
        <h2>Corrections and concerns</h2>
        <p>Applications change, so listings can become outdated. Report an error with the application name, the detail that needs correction, and a current source when possible through the <a href="https://github.com/Beingpax/macify">Macify GitHub repository</a>.</p>
        <p>Credible safety, copyright, trademark, and availability concerns will be reviewed. Macify keeps final control over whether and how a listing changes. For site data and analytics, read the <Link href="/privacy">privacy notice</Link>.</p>
      </section>
    </PolicyLayout>
  );
}
