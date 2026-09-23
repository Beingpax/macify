import type { ReactNode } from "react";
import Script from "next/script";
import { InlineAppSearch } from "@/components/inline-app-search";
import { PublicHeaderNavigation } from "@/components/public-header-navigation";
import { PublicFooter } from "@/components/public-footer";

const contributionGuideUrl = "https://github.com/Beingpax/macify/blob/main/CONTRIBUTING.md";

function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <PublicHeaderNavigation contributionGuideUrl={contributionGuideUrl} />
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
        strategy="lazyOnload"
      />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <div className="public-page-content">{children}</div>
      {showFooter && <PublicFooter />}
    </div>
  );
}
