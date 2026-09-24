import type { Metadata } from "next";
import Link from "next/link";
import { PublicAppIcon } from "@/components/site/public-app-card";
import { PublicShell } from "@/components/site/public-site";
import { getPublishedCategories } from "@/lib/directory/category-directory-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mac app categories",
  description: "Browse Macify's curated Mac applications by category.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getPublishedCategories();
  return <PublicShell>
    <main className="category-page category-index-page" id="main-content">
      <header className="category-page-header">
        <h1><span className="category-page-mark" aria-hidden="true" /><span className="category-page-title">Categories<span className="category-page-period">.</span></span></h1>
        <p>Explore apps by what they help you do.</p>
      </header>
      <div className="category-index-grid">
        {categories.map((category) => <Link href={`/categories/${category.slug}`} key={category.id}>
          <strong>{category.name}</strong>
          <span className="category-app-gallery" aria-hidden="true">
            {category.applications.slice(0, 3).map((application) => (
              <PublicAppIcon app={application} decorative key={application.id} size={50} />
            ))}
          </span>
        </Link>)}
      </div>
    </main>
  </PublicShell>;
}
