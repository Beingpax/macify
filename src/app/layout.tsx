import type { Metadata } from "next";
import { Caprasimo, Caveat, Roboto, Urbanist } from "next/font/google";
import Script from "next/script";
import { themeCssVariables } from "@/lib/shared/theme-colors";
import "./globals.css";
import "../styles/color-theme.css";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/public/layout/shell.css";
import "../styles/public/layout/footer.css";
import "../styles/public/pages/home.css";
import "../styles/public/pages/directory-heading.css";
import "../styles/public/pages/deals-hero.css";
import "../styles/public/pages/deals-list.css";
import "../styles/public/pages/category-index.css";
import "../styles/public/pages/directory-results.css";
import "../styles/public/pages/application-detail.css";
import "../styles/public/layout/markdown.css";
import "../styles/public/pages/policy.css";
import "../styles/public/pages/featured-unavailable.css";
import "../styles/public/pages/deals-how.css";
import "../styles/public/pages/submission.css";
import "../styles/public/pages/editorial-policy.css";
import "../styles/public/responsive/responsive-tablet.css";
import "../styles/public/responsive/responsive-small.css";
import "../styles/public/layout/footer-variants.css";
import "../styles/public/pages/editorial-guides.css";
import "../styles/public/pages/surprise.css";
import "../styles/public/layout/site-actions.css";
import "../styles/public/layout/voiceink-offer-banner.css";

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

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-policy",
  weight: ["400", "700", "900"],
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
        width: 1730,
        height: 909,
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
    <html data-scroll-behavior="smooth" lang="en" style={themeCssVariables}>
      <body className={`${urbanist.variable} ${caprasimo.variable} ${caveat.variable} ${roboto.variable}`}>
        <Script id="datafast-queue" strategy="beforeInteractive">
          {`window.datafast = window.datafast || function() { window.datafast.q = window.datafast.q || []; window.datafast.q.push(arguments); };`}
        </Script>
        {children}
      </body>
    </html>
  );
}
