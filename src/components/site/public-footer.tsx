import Link from "next/link";
import { MacifyLogo } from "@/components/site/macify-logo";

const githubUrl = "https://github.com/Beingpax/macify";
const paxUrl = "https://x.com/JoshiPax";

const browseLinks = [
  ["All Mac apps", "/#all-apps"],
  ["Deals", "/deals"],
  ["Browse by category", "/categories"],
  ["Blog", "/blog"],
  ["Surprise me", "/surprise"],
] as const;

const aboutLinks = [
  ["Submit an app", "/submit"],
  ["Get featured", "/get-featured"],
  ["Editorial policy", "/editorial-policy"],
  ["Privacy", "/privacy"],
  ["Affiliate disclosure", "/privacy#affiliate-links"],
] as const;

function FooterLinks({ label, links }: { label: string; links: readonly (readonly [string, string])[] }) {
  return (
    <nav className="curious-footer-nav" aria-label={label}>
      <h2>{label}</h2>
      {links.map(([text, href]) => <Link href={href} key={href}>{text}</Link>)}
    </nav>
  );
}

export function PublicFooter() {
  return (
    <section className="footer-transition-study footer-transition-horizon">
      <footer className="public-footer curious-footer">
        <div className="curious-footer-shell">
          <div className="curious-footer-grid">
            <div className="curious-footer-identity">
              <MacifyLogo showMark={false} />
              <p>A curated list of the most useful macOS applications. Find Mac apps worth making room for.</p>
              <a className="curious-footer-maker" href={paxUrl} target="_blank" rel="noopener noreferrer">
                <span>Made with</span>
                <svg className="curious-footer-heart" role="img" aria-label="love" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" /></svg>
                <span>by <strong>Pax</strong></span>
              </a>
              <nav className="curious-footer-socials" aria-label="Social links">
                <a href={paxUrl} target="_blank" rel="noopener noreferrer" aria-label="Pax on X"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.474l8.599-9.827L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" /></svg></a>
                <a href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label="Macify on GitHub"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.5-1.29-1.24-1.63-1.24-1.63-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.17 1.73 1.17 1 .1.79 2.14 3.25 1.55.1-.73.39-1.24.71-1.52-2.5-.28-5.13-1.25-5.13-5.58 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15A10.7 10.7 0 0 1 12 6.31c.95 0 1.9.13 2.79.38 2.13-1.45 3.07-1.15 3.07-1.15.62 1.55.23 2.7.12 2.98.72.79 1.15 1.79 1.15 3.02 0 4.34-2.63 5.3-5.14 5.58.4.35.75 1.04.75 2.1v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" /></svg></a>
              </nav>
              <p className="curious-footer-copyright">© {new Date().getFullYear()} Macify. All rights reserved.</p>
            </div>
            <FooterLinks label="Browse" links={browseLinks} />
            <FooterLinks label="Macify" links={aboutLinks} />
          </div>
          <div className="footer-transition-word footer-signoff-word" aria-hidden="true"><span>Macify.app</span></div>
        </div>
      </footer>
    </section>
  );
}
