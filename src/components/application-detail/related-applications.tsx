import Link from "next/link";
import { PublicAppIcon } from "@/components/site/public-app-card";
import type { PublishedApplication } from "@/components/application-detail/types";

export function RelatedApplications({ applications, mediaScope = "public" }: { applications: Array<Pick<PublishedApplication["related"][number], "id" | "slug" | "name" | "icon">>; mediaScope?: "public" | "dashboard" }) {
  if (!applications.length) return null;
  return (
    <section className="related-applications" aria-labelledby="related-applications-title">
      <div className="related-applications-heading"><h2 id="related-applications-title">Related apps.</h2></div>
      <div className="related-application-shelf">{applications.map((app) => (
        <Link href={mediaScope === "dashboard" ? `/dashboard/apps/${app.id}` : `/apps/${app.slug}`} key={app.id}>
          <PublicAppIcon mediaScope={mediaScope} app={app} size={76} />
          <strong>{app.name}</strong>
        </Link>
      ))}</div>
    </section>
  );
}
