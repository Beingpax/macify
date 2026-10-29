import { SignupForm } from "@/components/black-friday/signup-form";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Tag } from "lucide-react";
import { PublicShell } from "@/components/site/public-site";

const description = "Get notified when Macify's handpicked Black Friday 2026 Mac app deals go live.";

export const metadata: Metadata = {
  title: "Black Friday 2026 Mac app deals",
  description,
  alternates: { canonical: "/black-friday" },
  openGraph: { title: "Black Friday 2026 Mac app deals | Macify", description, url: "/black-friday" },
};

export default function BlackFridayPage() {
  return (
    <PublicShell>
      <main className="black-friday" id="main-content">
        <section className="black-friday-hero" aria-labelledby="black-friday-title">
          <div className="black-friday-copy">
            <p className="black-friday-label"><span /> Black Friday 2026</p>
            <h1 id="black-friday-title">Good apps.<br /><em>Better prices.</em></h1>
            <p className="black-friday-intro">Black Friday isn’t here yet. Sign up for handpicked deals on Mac apps when the sale goes live.</p>
            <SignupForm />
          </div>
          <div className="black-friday-artwork">
            <Image
              src="/black-friday/software-box-2026-v2.webp"
              alt="Macify Black Friday sale 2026, illustrated as a red software box with a smiling classic Mac and a yellow sale seal."
              width={1254}
              height={1254}
              sizes="(max-width: 800px) calc(100vw - 40px), 48vw"
              priority
              unoptimized
            />
          </div>
        </section>
        <section className="black-friday-details" aria-label="What to expect">
          <p>Looking for a deal today?</p>
          <Link href="/deals">Explore current deals <Tag size={18} aria-hidden="true" /></Link>
        </section>
      </main>
    </PublicShell>
  );
}
