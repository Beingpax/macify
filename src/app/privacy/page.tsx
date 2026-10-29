import type { Metadata } from "next";
import Link from "next/link";
import {
  PublicContentHero,
  PublicContentPage,
  PublicContentSection,
} from "@/components/site/public-content-page";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What happens to your data when you browse Macify.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicContentPage className="privacy-page">
      <PublicContentHero kicker="How Macify handles site data" title="Privacy notice.">
        <p>What happens to your data when you browse Macify.</p>
        <small>Last updated October 29, 2026</small>
      </PublicContentHero>

      <PublicContentSection id="information" title="Information we handle">
        <p>Macify is a public application directory. It does not offer public accounts, payments, saved applications, or public submission forms.</p>
        <p>When you visit, the site processes standard technical information, including your IP address, requested page, browser and device details, referrer, approximate country, and security or diagnostic signals. If you email Macify, we receive the address, message, and any other information you choose to send.</p>
        <p>If you sign up for Black Friday alerts, your email address is submitted to Kit, our email service provider, to manage your subscription and send the alerts you requested. You can unsubscribe using the link in an email or contact us to request deletion.</p>
      </PublicContentSection>

      <PublicContentSection id="use" title="How we use it">
        <p>Technical information is used to deliver pages and media, keep the site reliable, diagnose errors, and prevent abuse. Usage information helps us understand how people find and use the directory. Messages are used to answer questions, rights requests, and correction reports.</p>
        <p>Where a legal basis is required, these uses generally rely on Macify’s legitimate interests in operating, securing, and improving the site. Consent is required where applicable law requires it for analytics cookies.</p>
      </PublicContentSection>

      <PublicContentSection id="analytics" title="Analytics and cookies">
        <p>Macify uses analytics to measure page visits, referral sources, approximate visitors online, outside-link clicks, and deal-code copies. The service uses a cookie and processes standard technical information, including the destination of clicked outside links.</p>
        <p>Analytics is not connected to a public Macify account, used for personalized advertising, or sold. You can block or delete analytics cookies in your browser without losing access to the directory.</p>
      </PublicContentSection>

      <PublicContentSection id="affiliate-links" title="Providers and outside links">
        <p>Macify shares information only as needed with providers that host, secure, deliver, and measure the site, or when disclosure is required by law. These providers may process information in other countries under their own terms and any legally required transfer safeguards.</p>
        <p>Links to application websites, app stores, videos, and other services take you to sites with their own privacy practices. Some links may be affiliate links. A purchase through these links may earn Macify a commission at no additional cost to the buyer. The destination may receive an affiliate identifier along with standard request information.</p>
      </PublicContentSection>

      <PublicContentSection id="retention" title="Retention and security">
        <p>Technical records, analytics, and messages are kept only while reasonably needed to operate and protect the site, answer requests, maintain useful reporting, or meet legal obligations. The exact period depends on the record and the settings of the service that stores it.</p>
        <p>Administrative access is limited and reasonable safeguards are used to protect information. No internet service can guarantee absolute security.</p>
      </PublicContentSection>

      <PublicContentSection id="choices" title="Your choices and rights">
        <p>Depending on where you live, you may have rights to access, correct, delete, restrict, or object to the use of your personal information, withdraw consent, or complain to a data-protection authority.</p>
        <p>Send privacy questions or rights requests to <a href="mailto:privacy@macify.app">privacy@macify.app</a>. We may need to verify a request before acting on it. This notice will change when Macify’s data practices change.</p>
        <p>For how applications are selected and described, read the <Link href="/editorial-policy">editorial policy</Link>.</p>
      </PublicContentSection>
    </PublicContentPage>
  );
}
