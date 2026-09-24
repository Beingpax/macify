import { descriptionParts } from "@/lib/application-description";
import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { mediaUrl } from "@/components/public-app-card";
import type { ApplicationMedia, PublishedApplication } from "@/components/application-detail/types";

type OverviewApplication = Pick<PublishedApplication, "name" | "description" | "tagline" | "websiteUrl" | "youtubeUrl">;

function EditorialImage({ application, media, preload = false, mediaScope }: { application: OverviewApplication; media: ApplicationMedia; preload?: boolean; mediaScope: "public" | "dashboard" }) {
  return (
    <Image
      alt={media.altText ?? `${application.name} application preview`}
      height={media.height ?? 900}
      loading={preload ? undefined : "lazy"}
      preload={preload}
      quality={78}
      sizes={`(max-width: 38rem) calc(100vw - 2rem), min(calc(100vw - clamp(4rem, 6.4vw, 6rem)), ${preload ? "66rem" : "72rem"})`}
      src={mediaUrl(media.storageKey, mediaScope)}
      unoptimized={mediaScope === "dashboard"}
      width={media.width ?? 1600}
    />
  );
}

export function ApplicationOverview({
  application,
  preview,
  screenshots,
  mediaScope = "public",
}: {
  application: OverviewApplication;
  mediaScope?: "public" | "dashboard";
  preview?: ApplicationMedia;
  screenshots: ApplicationMedia[];
}) {
  const description = descriptionParts(application.description, application.tagline, application.name);
  return (
    <div className="application-overview">
      {preview && <figure className="application-preview"><EditorialImage mediaScope={mediaScope} application={application} media={preview} preload /></figure>}
      <div className="application-body">
        <article className="application-story">
          {description.lead && <div className="application-story-lead"><MarkdownContent>{description.lead}</MarkdownContent></div>}
          {description.sections.length > 0 && (
            <div className="application-story-sections">
              {description.sections.map((section) => (
                <section key={section.title}>
                  <h2>{section.title}</h2>
                  <MarkdownContent>{section.body}</MarkdownContent>
                </section>
              ))}
            </div>
          )}
          <a aria-label={`Visit ${application.name} site (opens in a new tab)`} className="application-website site-action site-action--primary" href={application.websiteUrl} rel="noreferrer" target="_blank">
            Visit site
            <ExternalLink aria-hidden="true" size={19} strokeWidth={1.8} />
          </a>
        </article>
        {application.youtubeUrl && <aside className="application-demo"><a href={application.youtubeUrl} rel="noreferrer" target="_blank"><span><Play size={15} /> Watch the demo</span><ExternalLink aria-hidden="true" size={14} /></a></aside>}
      </div>
      {screenshots.length > 0 && (
        <div className="application-screenshots" aria-label={`${application.name} screenshots`}>
          {screenshots.map((screenshot) => <figure key={screenshot.id}><EditorialImage mediaScope={mediaScope} application={application} media={screenshot} /></figure>)}
        </div>
      )}
    </div>
  );
}
