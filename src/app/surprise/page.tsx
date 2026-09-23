import type { Metadata } from "next";
import { PublicShell } from "@/components/public-site";
import { SurpriseExperience } from "@/components/surprise/surprise-experience";
import { getSurpriseApplications, type SurpriseApplication } from "@/lib/surprise-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Surprise me with a Mac app",
  description: "Let Macify pick a useful macOS application from the curated catalogue.",
  alternates: { canonical: "/surprise" },
  openGraph: {
    title: "Surprise me with a Mac app",
    description: "Let Macify pick a useful macOS application from the curated catalogue.",
    url: "/surprise",
  },
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Surprise me with a Mac app",
  url: "https://macify.app/surprise",
  description: "An interactive way to discover a useful macOS application from Macify's curated catalogue.",
  isPartOf: { "@id": "https://macify.app/#website" },
};

export default async function SurprisePage() {
  const applications: SurpriseApplication[] = shuffle(await getSurpriseApplications());

  return (
    <PublicShell showFooter={false}>
      <main className="surprise-page" id="main-content">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />
        <SurpriseExperience applications={applications} />
      </main>
    </PublicShell>
  );
}
