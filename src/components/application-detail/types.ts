import type { getPublishedApplicationBySlug } from "@/lib/directory/published-app-data";

export type PublishedApplication = NonNullable<Awaited<ReturnType<typeof getPublishedApplicationBySlug>>>;
export type ApplicationMedia = PublishedApplication["media"][number];
