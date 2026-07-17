# Macify

Macify is a curated directory for discovering excellent macOS applications. It is an application catalog and discovery product—not a blog—and is designed primarily for general Mac users, followed by professionals and developers.

The product should feel trustworthy, polished, approachable, spacious, and fast. Discovery is organized around what people want to accomplish—AI, productivity, design, writing, development, automation, utilities, and similar needs—rather than heavy Apple-themed branding.

## Product goals

- Excellent technical SEO and indexable application/category pages
- Fast page delivery through server rendering and Cloudflare caching
- High-quality curation with human approval of externally researched drafts
- A custom, WordPress-like admin dashboard for managing the catalog
- A portable foundation for future accounts, voting, submissions, reviews, alternatives, and community rankings
- A clear two-provider architecture with minimal operational overhead
- Clear separation between editorial rankings and sponsored placements

## Initial product

- Homepage featuring at least 30 curated applications
- Browse-all and category pages
- Search and essential filtering
- Application pages with editorial content, media, pricing, source type, and taxonomy
- Custom `/admin` area for applications, categories, assets, JSON import, draft review, and publishing

Accounts, community voting, developer submissions, comparisons, alternatives, and full reviews are intentionally deferred.

## Technical direction

| Area | Choice |
| --- | --- |
| Application | Pinned stable Next.js App Router with TypeScript |
| Runtime and hosting | Cloudflare Workers through the OpenNext adapter |
| CDN, DNS, and caching | Cloudflare |
| Database | Supabase PostgreSQL |
| Runtime data access | Supabase Data API through `supabase-js`; SQL/RPC for database-side operations |
| Authentication | Supabase Auth |
| Admin | Custom dashboard inside the application |
| Asset storage | Cloudflare R2 |
| Image delivery | Versioned WebP/AVIF assets through a cached custom domain |
| Database changes | Versioned Supabase SQL migrations and generated TypeScript types |
| Content import | Schema-validated JSON through a local importer or the admin |
| Search | PostgreSQL full-text search initially |
| Styling | Tailwind CSS with a custom visual system; accessible components added selectively |

Supabase is used for structured data and authentication, not public image delivery. Administrative permissions must be enforced server-side and through PostgreSQL Row Level Security.

## Architecture boundary

Macify intentionally uses two infrastructure providers with one clear responsibility each.

**Cloudflare owns the delivery plane:**

- Run the Next.js application on Workers.
- Cache anonymous public pages and static assets near visitors.
- Store and deliver icons, screenshots, and hero images from R2.
- Provide DNS, TLS, WAF, bot protection, and Turnstile when submissions arrive.

**Supabase owns the data plane:**

- Store all relational catalog, taxonomy, account, submission, moderation, and voting data in PostgreSQL.
- Provide authentication, Row Level Security, database administration, pooling, and production backups.
- Expose the Data API used by the application, with SQL functions for operations that belong inside PostgreSQL.

Do not initially add Cloudflare D1, KV as an authoritative data store, Hyperdrive, Supabase Storage, Supabase Edge Functions, Supabase Realtime, Redis, or a separate search service. Add infrastructure only after profiling demonstrates a specific need.

## Why this setup

The end goal is not to build an infrastructure experiment. It is to publish the fastest trustworthy macOS application directory we can operate easily, then add accounts, submissions, voting, and moderation without replacing the core database.

- Macify is read-heavy. Cloudflare can serve most public visits from cache without querying Supabase on every request.
- Future accounts, submissions, votes, audit history, and taxonomy are relational. Full PostgreSQL is a better long-term source of truth than local SQLite or D1 for this roadmap.
- Supabase keeps PostgreSQL, Auth, Row Level Security, backups, and administration connected in one backend product.
- R2 keeps public media on the delivery side, supports an S3-compatible interface, and avoids Internet egress charges from R2.
- Next.js provides indexable server-rendered HTML while retaining one application for public pages, admin tools, and server operations. It also has the strongest current support for AI-assisted implementation through version-matched documentation, runtime diagnostics, and a large body of established examples.
- The database remains portable PostgreSQL. Supabase-specific Auth and Row Level Security still create some coupling, which is accepted for the simpler development experience.

The main architectural risk is network distance between a globally executing Worker and the single primary Supabase region. The mitigation is to cache public pages, choose the Supabase region closest to the expected write traffic, avoid database waterfalls, and measure uncached request latency before adding another connection layer.

## Decision record

The plan was narrowed through the following decisions:

1. Autonomous AI/web research was removed. External tools may research and return versioned JSON, but Macify only imports it as a validated, human-reviewed draft.
2. Local SQLite was considered for simplicity and low latency. It was not selected as the production source of truth because the roadmap includes concurrent accounts, submissions, moderation, and voting.
3. Cloudflare D1 was considered because it would keep everything on Cloudflare. It was rejected as the authoritative database to avoid a likely later move from SQLite semantics to PostgreSQL.
4. Vercel was rejected because cost predictability and reduced platform coupling matter more than its native Next.js convenience.
5. Self-hosting and Railway were considered. Self-hosting adds backup, security, failover, and maintenance work; Railway's standard PostgreSQL service is described as unmanaged.
6. DigitalOcean was considered as a single-provider platform. It is operationally coherent, but Supabase provides a more connected application backend for Auth, Row Level Security, and database workflows.
7. The final boundary keeps Cloudflare for delivery and media, and Supabase for relational data and authentication. This is two providers, but no duplicated responsibility.
8. Next.js was selected over SvelteKit, Astro, React Router, and TanStack Start. SvelteKit and Astro can be lighter by default, but Next.js is the better overall fit for AI-assisted development, SEO, and the planned dashboard/community features. TanStack Start remains less suitable while it is pre-1.0.

## Application content model

Each application starts with these editorial fields:

- Name
- Subtitle
- Rich-text description in a sanitized, structured format
- Official link
- Icon
- Hero image
- One primary category
- One or more focused subcategories
- Pricing classification: free, freemium, or paid
- Payment models for freemium or paid apps: one-time purchase, subscription, or both
- Internal source classification: open source, source-available, or closed source

Categories describe broad areas such as Utilities. Subcategories describe the specific job, such as Screen Recording, Dictation, or Screenshots. Related applications are derived primarily from shared subcategories, with an optional editorial override later. "Related applications" is a page section, not a category.

YouTube videos do not need a separate application field. The rich-text description may contain a validated YouTube embed node; arbitrary iframe or script HTML is not accepted.

Price amounts are not stored initially. Source classification is admin-only and is not shown on public pages. Draft, published, and archived states control publication; availability and manually maintained verification or update fields are not part of the content model. Database timestamps remain internal system metadata.

## Content workflow

1. Ask any external research or AI tool to return the prescribed application JSON.
2. Paste or upload that JSON through the local/admin importer.
3. Validate and normalize the data against a versioned schema; reject invalid or unknown fields.
4. Store imported content as a draft and process its icon and hero image separately.
5. Review the rich text, links, images, sources, and taxonomy in the admin dashboard.
6. Publish and refresh affected Cloudflare caches, category pages, sitemap, and search data.

Macify does not automatically browse the web or call AI providers in the initial product. Imported content is never published without human approval.

## Performance and SEO

- Render meaningful HTML without requiring client-side JavaScript.
- Use Server Components by default and place `use client` only around the smallest interactive elements.
- Cache anonymous published pages at Cloudflare's edge; a normal page view should not query Supabase after a cache hit.
- Keep admin, account, submission, and voting routes dynamic and outside shared caches.
- Render personalized account controls as a small client-side island so authentication does not make every public page dynamic.
- On publication, invalidate only the affected application, taxonomy, homepage, sitemap, and search cache entries.
- Use stable, human-readable URLs and canonical metadata.
- Generate XML sitemaps, robots rules, breadcrumbs, and accurate structured data.
- Pre-generate common image sizes and use long-lived, versioned asset URLs.
- Self-host fonts, limit third-party scripts, and avoid unnecessary route prefetching.
- Keep initial compressed JavaScript below 100 KB on public routes and monitor Core Web Vitals at the 75th percentile.
- Index every frequently used database filter, relationship, and ranking path.
- Avoid sequential database calls and select only the columns needed by each route.
- Avoid automatically generated thin comparison or alternative pages.

Initial public routes:

```text
/
/apps
/apps/{app-slug}
/categories/{category-slug}
```

## Reliability

- Run production data on a paid Supabase plan with automatic backups.
- Maintain independent scheduled PostgreSQL backups.
- Keep media in R2, separate from the database provider.
- Keep an independent inventory of R2 object keys and periodically verify media backups.
- Serve cached public pages during temporary backend interruptions.
- Keep database migrations, application logic, JSON schemas, and import fixtures versioned in this repository.

## Research basis

Primary documentation, reviewed in July 2026:

- [Cloudflare: Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) documents the OpenNext deployment path and supported Next.js features.
- [Next.js: AI coding agents](https://nextjs.org/docs/app/guides/ai-agents) documents version-matched framework guidance for coding tools.
- [Next.js: MCP server](https://nextjs.org/docs/app/guides/mcp) documents runtime inspection of routes, logs, errors, and application state.
- [Cloudflare: R2 pricing](https://developers.cloudflare.com/r2/pricing/) documents storage/operation pricing and free Internet egress.
- [Cloudflare: caching R2](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/) documents custom-domain and cache behavior.
- [Supabase: database overview](https://supabase.com/docs/guides/database/overview) confirms that projects use full PostgreSQL and describes managed backups.
- [Supabase: Auth architecture](https://supabase.com/docs/guides/auth/architecture) explains how Auth and PostgreSQL share the same project data plane.
- [Supabase: connecting to PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres) documents the Data API and serverless/edge connection options.
- [Supabase: pricing](https://supabase.com/pricing) is the source of current plan allowances and overage pricing; costs must be rechecked before launch.

Community reports were used as directional evidence, not guarantees:

- [Cloudflare Workers and Supabase latency](https://www.reddit.com/r/CloudFlare/comments/1jh3egy/) highlighted the cost of distance between Workers and the database region.
- [Caching reduced Supabase egress](https://www.reddit.com/r/Supabase/comments/1scj2ol/supabase_egress_5x_after_moving_from_vercel_to/) reinforced the need to avoid database work on every public request.
- [Supabase database with Cloudflare R2](https://www.reddit.com/r/Supabase/comments/1i7xjog/) and [Supabase Storage versus R2](https://www.reddit.com/r/Supabase/comments/1ozpxnt/using_supabase_only_for_storage_cdn/) informed the media-storage boundary.
- [Next.js, Supabase Auth, and Cloudflare caching](https://www.reddit.com/r/nextjs/comments/1t75h8h/nextjs_supabase_auth_cloudflare_cached_pages_vs/) informed the static public shell and client-side auth-island approach.

## Brand and domain

The working brand is **Macify**. The preferred primary domain is **macify.app**, with `macify.io` considered only as an optional defensive redirect.

Suggested positioning:

> Macify — Discover the best apps for your Mac.

## Roadmap

1. Initialize the Next.js and Cloudflare application foundation.
2. Define the schema, taxonomy, Row Level Security, asset conventions, and admin roles using five representative applications.
3. Build the schema-validated JSON importer and human review/publishing workflow.
4. Build the homepage, directory, category, subcategory, application, related-app, and search experiences.
5. Expand to 30 curated applications and complete launch hardening.
6. Add sponsorship tooling and community functionality only after the editorial product is established.
