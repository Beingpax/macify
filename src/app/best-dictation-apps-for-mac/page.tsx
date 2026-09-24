import type { Metadata } from "next";
import { DictationGuide } from "@/components/best-apps/dictation-comparison";
import { PublicShell } from "@/components/site/public-site";
import { createBlogPostMetadata, createBlogPostSchema } from "@/content/blog";
import { bestDictationAppsPost } from "@/content/blog/posts/best-dictation-apps-for-mac";
import { getPublishedDictationApps } from "@/content/blog/posts/best-dictation-apps-for-mac/comparison";

export const dynamic = "force-dynamic";
export const metadata: Metadata = createBlogPostMetadata(bestDictationAppsPost);

export default async function BestDictationAppsPage() {
  const apps = await getPublishedDictationApps();
  const reviewedAt = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${bestDictationAppsPost.updatedAt}T00:00:00Z`));
  const schema = createBlogPostSchema(bestDictationAppsPost, apps.map((app) => app.name));

  return (
    <PublicShell>
      <main className="best-apps-page" id="main-content">
        {apps.length > 0 ? <DictationGuide apps={apps as Parameters<typeof DictationGuide>[0]["apps"]} reviewedAt={reviewedAt} /> : (
          <section className="best-apps-empty"><h2>Comparison unavailable.</h2><p>The dictation apps have not been published to this catalogue yet.</p></section>
        )}
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}
