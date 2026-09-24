import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/content/blog";
import { getPublishedApplicationSlugs } from "@/lib/directory/published-app-data";
import { getPublishedCategorySlugs } from "@/lib/directory/category-directory-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = getAllBlogPosts();
  const [applications, categories] = await Promise.all([getPublishedApplicationSlugs(), getPublishedCategorySlugs()]);
  const catalogueLastModified = applications[0]?.updatedAt;

  return [
    { url: "https://macify.app", lastModified: catalogueLastModified, changeFrequency: "daily", priority: 1 },
    { url: "https://macify.app/categories", lastModified: catalogueLastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: "https://macify.app/deals", lastModified: catalogueLastModified, changeFrequency: "daily", priority: 0.7 },
    { url: "https://macify.app/surprise", lastModified: catalogueLastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: "https://macify.app/blog", lastModified: blogPosts[0]?.updatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: "https://macify.app/editorial-policy", lastModified: "2026-09-23", changeFrequency: "monthly", priority: 0.4 },
    { url: "https://macify.app/submit", lastModified: "2026-09-24", changeFrequency: "monthly", priority: 0.4 },
    { url: "https://macify.app/deals/how-it-works", changeFrequency: "monthly", priority: 0.4 },
    { url: "https://macify.app/privacy", changeFrequency: "monthly", priority: 0.3 },
    ...blogPosts.map(({ path, updatedAt }) => ({
      url: `https://macify.app${path}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...categories.map(({ slug, updatedAt }) => ({
      url: `https://macify.app/categories/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...applications.map(({ slug, updatedAt }) => ({
      url: `https://macify.app/apps/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
