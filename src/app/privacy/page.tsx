import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What happens to your data when you browse Macify.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PolicyLayout
      title="Privacy notice"
      updatedAt="September 8, 2026"
      description="What happens to your data when you browse Macify."
    >
      <section id="information">
        <h2>Information we handle</h2>
        <p>Macify is a public application directory. It does not offer public accounts, saved applications, or submission forms. Featured placement payments take place on Dodo Payments’ checkout, under its own privacy terms.</p>
        <p>When you visit, the site processes standard technical information, including your IP address, requested page, browser and device details, referrer, approximate country, and security or diagnostic signals. If you email Macify, we receive the address, message, and any other information you choose to send.</p>
      </section>
      <section id="use">
        <h2>How we use it</h2>
        <p>Technical information is used to deliver pages and media, keep the site reliable, diagnose errors, and prevent abuse. Usage information helps us understand how people find and use the directory. Messages are used to answer questions, rights requests, and correction reports.</p>
        <p>Where a legal basis is required, these uses generally rely on Macify’s legitimate interests in operating, securing, and improving the site. Consent is required where applicable law requires it for analytics cookies.</p>
      </section>
      <section id="analytics">
        <h2>Analytics and cookies</h2>
        <p>Macify uses an analytics service to measure page visits, referral sources, and the approximate number of visitors online. The current analytics setup uses a cookie to recognize a browser and processes IP address, browser and device information, approximate country, referrer, and page activity.</p>
        <p>Analytics is not connected to a public Macify account, used for personalized advertising, or sold. You can block or delete analytics cookies in your browser without losing access to the directory.</p>
      </section>
      <section id="affiliate-links">
        <h2>Providers and outside links</h2>
        <p>Macify shares information only as needed with providers that host, secure, deliver, and measure the site, or when disclosure is required by law. These providers may process information in other countries under their own terms and any legally required transfer safeguards.</p>
        <p>Links to application websites, app stores, videos, and other services take you to sites with their own privacy practices. Some links may be affiliate links. A purchase through these links may earn Macify a commission at no additional cost to the buyer. The destination may receive an affiliate identifier along with standard request information.</p>
      </section>
      <section id="retention">
        <h2>Retention and security</h2>
        <p>Technical records, analytics, and messages are kept only while reasonably needed to operate and protect the site, answer requests, maintain useful reporting, or meet legal obligations. The exact period depends on the record and the settings of the service that stores it.</p>
        <p>Administrative access is limited and reasonable safeguards are used to protect information. No internet service can guarantee absolute security.</p>
      </section>
      <section id="choices">
        <h2>Your choices and rights</h2>
        <p>Depending on where you live, you may have rights to access, correct, delete, restrict, or object to the use of your personal information, withdraw consent, or complain to a data-protection authority.</p>
        <p>Send privacy questions or rights requests to <a href="mailto:privacy@macify.app">privacy@macify.app</a>. We may need to verify a request before acting on it. This notice will change when Macify’s data practices change.</p>
        <p>For how applications are selected and described, read the <Link href="/editorial-policy">editorial policy</Link>.</p>
      </section>
    </PolicyLayout>
  );
}
