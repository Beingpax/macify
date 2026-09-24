import Image from "next/image";
import Link from "next/link";
import { PublicAppIcon, mediaUrl, type PublicAppSummary } from "@/components/site/public-app-card";

type HomeApp = PublicAppSummary & {
  preview: { storageKey: string; altText: string | null; width: number | null; height: number | null } | null;
};

const headlineSlugs = ["dayflow", "cleanshot-x", "swish"];

export function HomeHero({ applications }: { applications: HomeApp[] }) {
  const featured = applications.find((app) => app.slug === "droppy" && app.preview);
  const headlineApps = headlineSlugs
    .map((slug) => applications.find((app) => app.slug === slug && app.icon))
    .filter((app): app is HomeApp => Boolean(app));
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy">
        <h1 id="home-title">
          <span className="sr-only">Mac apps worth making room for.</span>
          <span className="home-title-art">
            <span className="home-title-line"><span aria-hidden="true">Mac</span>{headlineApps[0] && <Link aria-label={`Open ${headlineApps[0].name}`} className="home-title-icon" href={`/apps/${headlineApps[0].slug}`} prefetch={false}><PublicAppIcon app={headlineApps[0]} size={96} sizes="(max-width: 38rem) 48px, 96px" /></Link>}<span aria-hidden="true">apps</span></span>
            <span className="home-title-line"><span aria-hidden="true">worth</span>{headlineApps[1] && <Link aria-label={`Open ${headlineApps[1].name}`} className="home-title-icon home-title-icon-orange" href={`/apps/${headlineApps[1].slug}`} prefetch={false}><PublicAppIcon app={headlineApps[1]} size={96} sizes="(max-width: 38rem) 48px, 96px" /></Link>}<span aria-hidden="true">making</span></span>
            <span className="home-title-line">{headlineApps[2] && <Link aria-label={`Open ${headlineApps[2].name}`} className="home-title-icon home-title-icon-yellow" href={`/apps/${headlineApps[2].slug}`} prefetch={false}><PublicAppIcon app={headlineApps[2]} size={96} sizes="(max-width: 38rem) 48px, 96px" /></Link>}<span aria-hidden="true">room for.</span></span>
          </span>
        </h1>
        <p className="home-hero-intro">
          A curated list of the{" "}
          <span className="home-hero-intro-emphasis">
            most useful macOS applications.
            <svg aria-hidden="true" className="home-hero-intro-squiggle" focusable="false" preserveAspectRatio="none" viewBox="0 0 242 20">
              <path d="M1 10c8-8 16-8 24 0s16 6 24 0 16-7 24 0 16 8 24 0 16-6 24 0 16 7 24 0 16-8 24 0 16 6 24 0 16-7 24 0 16 8 24 0" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
        </p>
      </div>

      {featured && (
        <Link className="home-feature-stage" href={`/apps/${featured.slug}`} prefetch={false}>
          <div className="home-feature-caption">
            <PublicAppIcon app={featured} decorative size={76} />
            <span><strong>{featured.name}</strong><p>{featured.tagline}</p></span>
          </div>
          <div className="home-feature-image">
            {featured.preview ? (
              <Image
                alt=""
                fetchPriority="high"
                height={featured.preview.height ?? 900}
                loading="eager"
                quality={78}
                sizes="(max-width: 38rem) calc(100vw - 2rem), (max-width: 52rem) min(calc(100vw - clamp(4rem, 6.4vw, 6rem)), 42rem), (max-width: 68rem) 45vw, min(48.5vw, 35rem)"
                src={mediaUrl(featured.preview.storageKey)}
                width={featured.preview.width ?? 1600}
              />
            ) : <span>{featured.name}</span>}
          </div>
        </Link>
      )}
    </section>
  );
}
