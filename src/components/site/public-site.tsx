import type { ReactNode } from "react";
import Script from "next/script";
import { InlineAppSearch } from "@/components/site/inline-app-search";
import { PublicHeaderNavigation } from "@/components/site/public-header-navigation";
import { PublicFooter } from "@/components/site/public-footer";
import { BlackFridayBanner } from "@/components/site/black-friday-banner";

function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <PublicHeaderNavigation />
        <div className="public-header-actions">
          <InlineAppSearch />
        </div>
      </div>
    </header>
  );
}

export async function PublicShell({ children, showFooter = true }: { children: ReactNode; showFooter?: boolean }) {
  return (
    <div className="public-site">
      <Script
        data-domain="macify.app"
        data-website-id="dfid_Moyh2sl29BQAIQp2E4BmV"
        src="/js/script.js"
        strategy="afterInteractive"
      />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <BlackFridayBanner />
      <PublicHeader />
      <div className="public-page-content">{children}</div>
      {showFooter && <PublicFooter />}
    </div>
  );
}
