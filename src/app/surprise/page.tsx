import type { Metadata } from "next";
import { PublicShell } from "@/components/site/public-site";
import { SurpriseExperience } from "@/components/surprise/surprise-experience";
import { getSurpriseApplications, type SurpriseApplication } from "@/lib/surprise/surprise-data";

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

function shuffleApplications<T>(applications: T[]) {
  const shuffledApplications = [...applications];
  for (let index = shuffledApplications.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledApplications[index], shuffledApplications[swapIndex]] = [
      shuffledApplications[swapIndex],
      shuffledApplications[index],
    ];
  }
  return shuffledApplications;
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
  const applications: SurpriseApplication[] = shuffleApplications(await getSurpriseApplications());

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
