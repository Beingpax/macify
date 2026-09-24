import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DirectoryAppGrid } from "@/components/home/application-directory";
import { PublicShell } from "@/components/site/public-site";
import { getPublishedCategoryBySlug } from "@/lib/directory/category-directory-data";

export const dynamic = "force-dynamic";
const getCategory = cache(getPublishedCategoryBySlug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  const title = `${category.name} apps for Mac`;
  const description = `Explore ${category.applications.length} carefully selected Mac ${category.name.toLowerCase()} ${category.applications.length === 1 ? "app" : "apps"}.`;
  const canonical = `/categories/${category.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", siteName: "Macify", title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const category = await getCategory((await params).slug);
  if (!category) notFound();
  const count = category.applications.length;

  return (
    <PublicShell>
      <main className="category-page" id="main-content">
        <header className="category-page-header">
          <h1>
            <span className="category-page-mark" aria-hidden="true" />
            <span className="category-page-title">{category.name}<span className="category-page-period">.</span></span>
          </h1>
          <p>{count} {count === 1 ? "app" : "apps"}</p>
        </header>
        {count > 0 ? <DirectoryAppGrid applications={category.applications} /> : (
          <div className="category-page-empty"><p>No published apps use this category yet.</p></div>
        )}
      </main>
    </PublicShell>
  );
}
