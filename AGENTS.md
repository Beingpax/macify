# Repository instructions

## Product decisions

- Macify is a curated macOS application directory and discovery product, not a blog. Use directory, catalog, application, or project terminology.
- Do not add autonomous web research, scraping, or AI-provider calls to the initial product.
- Import externally researched application data through schema-validated JSON, always as a human-reviewed draft.
- Core fields include editorial content, media, taxonomy, pricing classification, payment models, and internal source classification.
- Pricing classification is free, freemium, or paid. Freemium and paid apps may use one-time purchase, subscription, or both.
- Do not store price amounts, usage-based pricing, or contact pricing initially.
- Source classification is open source, source-available, or closed source and remains admin-only.
- Do not add availability, last-verified, or manually maintained last-updated content fields. Use publication states and internal database timestamps.
- YouTube belongs in rich text as a validated embed node, not as a separate field or arbitrary HTML.
- Use broad parent categories and specific task-based subcategories. Derive related apps from shared subcategories.
- Do not model "related applications" as a category.

## Architecture decisions

- Use a pinned stable Next.js App Router release with TypeScript. Do not use canary releases or the Pages Router.
- Before changing framework behavior, read the documentation bundled with the installed Next.js version; use its MCP diagnostics when available.
- Use Cloudflare Workers through OpenNext for the Next.js runtime, public delivery, and edge caching.
- Use Cloudflare R2 for icons, screenshots, hero images, and other public media. Store only object keys and metadata in PostgreSQL.
- Use Supabase PostgreSQL as the sole authoritative relational database.
- Use Supabase Auth and enforce authorization both server-side and with PostgreSQL Row Level Security.
- Use `supabase-js` and the Supabase Data API initially. Prefer SQL/RPC for database-side operations.
- Keep Supabase and Cloudflare responsibilities separate: Cloudflare owns delivery/media; Supabase owns relational data/authentication.
- Do not initially add D1, Hyperdrive, Supabase Storage, Supabase Edge Functions, Supabase Realtime, Redis, or an external search service.
- Cache anonymous public pages so ordinary cache hits do not query Supabase.
- Prefer Server Components and pre-rendered HTML. Add `use client` only at the smallest interactive boundary.
- Keep initial compressed JavaScript below 100 KB on public routes; treat regressions as defects.
- Keep admin, account, submission, and voting routes dynamic and outside shared caches.
- Invalidate only affected public routes after publishing content.
- Choose the Supabase region closest to expected write traffic and measure uncached latency before adding connection infrastructure.
- Keep all SQL migrations and generated database types versioned in the repository.
- Keep the UI stack small: Tailwind and the custom design system first; add accessible component packages only for demonstrated needs.

## Working style

- Critique plans directly and identify tradeoffs; do not agree without analysis.
- Report the exact cause of blocked commands. Do not label authentication failures as sandbox restrictions without evidence.
- Keep explanations and repository documentation concise.
- Do not create additional product or design context files.
