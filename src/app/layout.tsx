import type { Metadata } from "next";
import { Caprasimo, Caveat, Urbanist } from "next/font/google";
import "./globals.css";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/public/shell.css";
import "../styles/public/footer.css";
import "../styles/public/home.css";
import "../styles/public/directory-heading.css";
import "../styles/public/deals-hero.css";
import "../styles/public/deals-list.css";
import "../styles/public/category-index.css";
import "../styles/public/directory-results.css";
import "../styles/public/application-detail.css";
import "../styles/public/markdown.css";
import "../styles/public/policy.css";
import "../styles/public/responsive-tablet.css";
import "../styles/public/responsive-small.css";
import "../styles/public/footer-variants.css";
import "../styles/public/editorial-guides.css";
import "../styles/public/surprise.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
});

const caprasimo = Caprasimo({
  subsets: ["latin"],
  variable: "--font-caprasimo",
  weight: "400",
});

const caveat = Caveat({
  // This decorative face is not part of the LCP. Let the hero image and
  // primary UI fonts use the preload bandwidth first.
  preload: false,
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: "500",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://macify.app"),
  title: {
    default: "Macify — Useful macOS apps, carefully selected",
    template: "%s · Macify",
  },
  description:
    "A considered directory of useful macOS applications, with clear pricing, related alternatives, and practical editorial context.",
  applicationName: "Macify",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Macify",
    title: "Mac apps worth making room for. | Macify",
    description: "A curated list of the most useful macOS applications.",
    url: "https://macify.app",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Mac apps worth making room for. — Macify",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mac apps worth making room for. | Macify",
    description: "A curated list of the most useful macOS applications.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body className={`${urbanist.variable} ${caprasimo.variable} ${caveat.variable}`}>{children}</body>
    </html>
  );
}
