# Macify

Macify is a curated directory for discovering excellent macOS applications. It is designed primarily for general Mac users, followed by professionals and developers.

The product should feel trustworthy, polished, approachable, spacious, and fast. Discovery is organized around what people want to accomplish—AI, productivity, design, writing, development, automation, utilities, and similar needs—rather than heavy Apple-themed branding.

## Product goals

- Excellent technical SEO and indexable application/category pages
- Fast page delivery through server rendering and Cloudflare caching
- High-quality curation with human approval of AI-drafted content
- A custom, WordPress-like admin dashboard for managing the catalog
- A portable foundation for future accounts, voting, submissions, reviews, alternatives, and community rankings
- Clear separation between editorial rankings and sponsored placements

## Initial product

- Homepage featuring at least 30 curated applications
- Browse-all and category pages
- Search and essential filtering
- Application pages with icon, tagline, full description, official link, pricing, categories, and product imagery
- Custom `/admin` area for applications, categories, assets, publishing, rankings, sponsorships, and AI draft review

Accounts, community voting, developer submissions, comparisons, alternatives, and full reviews are intentionally deferred.

## Technical direction

| Area | Choice |
| --- | --- |
| Application | Next.js App Router with TypeScript |
| Hosting | Cloudflare Workers |
| CDN and caching | Cloudflare |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Admin | Custom dashboard inside the application |
| Asset storage | Cloudflare R2 |
| Image delivery | Versioned WebP/AVIF assets through a cached custom domain |
| AI ingestion | Cloudflare Workers and Queues with replaceable AI providers |
| Search | PostgreSQL full-text search initially |
| Styling | Tailwind CSS with a custom visual system |

Supabase is used for structured data and authentication, not public image delivery. Administrative permissions must be enforced server-side and through PostgreSQL Row Level Security.

## Content workflow

1. Add an application's official URL.
2. Extract verified metadata and source information.
3. Download its icon and OG/product image separately.
4. Store originals and optimized variants in Cloudflare R2.
5. Generate structured draft content through a provider-independent AI layer.
6. Review and edit the draft in the admin dashboard.
7. Publish and refresh affected Cloudflare caches, category pages, sitemap, and search data.

AI-generated content is never published without human approval.

## Performance and SEO

- Render meaningful HTML without requiring client-side JavaScript.
- Cache published pages at Cloudflare's edge.
- Use stable, human-readable URLs and canonical metadata.
- Generate XML sitemaps, robots rules, breadcrumbs, and accurate structured data.
- Pre-generate common image sizes and use long-lived, versioned asset URLs.
- Index every frequently used database filter, relationship, and ranking path.
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
- Serve cached public pages during temporary backend interruptions.
- Keep database migrations, application logic, and AI prompts versioned in this repository.

## Brand and domain

The working brand is **Macify**. The preferred primary domain is **macify.app**, with `macify.io` considered only as an optional defensive redirect.

Suggested positioning:

> Macify — Discover the best apps for your Mac.

## Roadmap

1. Initialize the Next.js and Cloudflare application foundation.
2. Define the initial schema, Row Level Security, asset conventions, and admin roles.
3. Build ingestion and human-review workflows.
4. Build the homepage, directory, categories, application pages, and search.
5. Curate and validate the first 30 applications.
6. Add community functionality only after the editorial product is established.
