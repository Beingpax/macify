import Link from "next/link";
import { Check, CircleHelp, ExternalLink, Minus, X } from "lucide-react";
import { PublicAppIcon, type PublicAppSummary } from "@/components/site/public-app-card";
import { dictationComparisonRows, dictationEditorial, dictationRecommendations, type ComparisonValue, type DictationAppSlug } from "@/content/blog/posts/best-dictation-apps-for-mac/comparison";

type DictationApp = PublicAppSummary & { slug: DictationAppSlug };

function Status({ value, iconOnly = false }: { value: ComparisonValue; iconOnly?: boolean }) {
  const Icon = value.state === "yes" ? Check : value.state === "no" ? X : value.state === "partial" ? Minus : CircleHelp;
  return <span aria-label={iconOnly ? value.note ? `${value.label}. ${value.note}` : value.label : undefined} className={`comparison-value comparison-value-${value.state ?? "text"}${iconOnly ? " comparison-value-icon-only" : ""}`} title={value.note ?? (iconOnly ? value.label : undefined)}>
    {value.state && <span className="comparison-state-icon" aria-hidden="true"><Icon size={13} strokeWidth={2.4} /></span>}
    {!iconOnly && <span>{value.label}</span>}
  </span>;
}

function Ledger({ apps }: { apps: DictationApp[] }) {
  return <div className="comparison-scroll"><table className="comparison-ledger">
    <thead><tr><th scope="col">App</th>{dictationComparisonRows.map((row) => <th key={row.key} scope="col">{row.label}</th>)}</tr></thead>
    <tbody>{apps.map((app) => <tr key={app.id}>
      <th scope="row"><Link className="comparison-app-name" href={`#review-${app.slug}`}>
        <PublicAppIcon app={app} decorative size={44} />
        <span>{app.name}</span>
      </Link></th>
      {dictationComparisonRows.map((row) => <td className={row.key === "price" ? undefined : "comparison-feature-cell"} key={row.key}><Status iconOnly={row.key !== "price"} value={row.values[app.slug]} /></td>)}
    </tr>)}</tbody>
  </table></div>;
}

export function DictationGuide({ apps, reviewedAt }: { apps: DictationApp[]; reviewedAt: string }) {
  return <div className="dictation-guide">
    <header className="best-apps-hero dictation-hero-quiet dictation-hero-final">
      <div className="best-apps-hero-copy">
        <p className="best-apps-breadcrumb"><Link href="/">Mac apps</Link><span aria-hidden="true">/</span><Link href="/categories/dictation">Dictation</Link></p>
        <h1>Best dictation apps for Mac<span>.</span></h1>
        <p>Mac dictation apps differ widely in price, privacy, accuracy, and how they process your voice. We compared six options to explain these differences and help you choose the one that best fits the way you work.</p>
        <div className="best-apps-meta"><span>{apps.length} apps compared</span><time dateTime="2026-09-08">Reviewed {reviewedAt}</time></div>
      </div>
    </header>

    <section className="comparison-workbench" aria-labelledby="comparison-title">
      <div className="comparison-section-heading"><div><h2 id="comparison-title">Compare at a glance.</h2></div></div>
      <Ledger apps={apps} />
      <p className="comparison-disclaimer"><span aria-hidden="true">✳</span> Features and prices change. “Not confirmed” means Macify could not verify the claim from current public developer information.</p>
    </section>

    <article className="dictation-article dictation-article-journal" aria-label="Dictation app reviews">
      {apps.map((app) => { const editorial = dictationEditorial[app.slug]; return <section className="dictation-review" key={app.id}>
        <header id={`review-${app.slug}`}>
          <h2><Link href={`/apps/${app.slug}`} prefetch={false}>{app.name}</Link></h2>
          <p className="dictation-review-tagline">{editorial.tagline}</p>
          <p className="dictation-review-best"><strong>Best for:</strong> {editorial.bestFor}</p>
        </header>
        <div className="dictation-review-copy">
          {editorial.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <h3>What stands out</h3>
          <ul>{editorial.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul>
          <h3>What to consider</h3>
          {editorial.considerations.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <a aria-label={`Visit ${app.name} official site (opens in a new tab)`} className="application-website site-action site-action--primary" data-outbound-app={app.slug} data-outbound-kind="app-website" data-outbound-placement="dictation-guide" href={editorial.sourceUrl} rel="noopener" target="_blank">
            Visit site
            <ExternalLink aria-hidden="true" size={19} strokeWidth={1.8} />
          </a>
        </div>
      </section>; })}

      <section className="dictation-recommendations" aria-labelledby="recommendations-title">
        <h2 id="recommendations-title">Our recommendations.</h2>
        <div className="recommendation-copy">
          {dictationRecommendations.map((recommendation) => <p key={recommendation.award}><strong><Link href={`/apps/${recommendation.slug}`} prefetch={false}>{recommendation.choice}</Link></strong> is {recommendation.award.toLowerCase()}. {recommendation.reason} {recommendation.tradeoff}</p>)}
        </div>
      </section>
    </article>
  </div>;
}
