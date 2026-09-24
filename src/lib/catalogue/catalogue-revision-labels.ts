import type { catalogueRevisions } from "@/db/schema";

type Revision = typeof catalogueRevisions.$inferSelect;

export const revisionStatusLabels: Record<Revision["status"], string> = {
  pending: "Awaiting publication",
  published: "Published",
  rejected: "Rejected",
  failed: "Sync failed",
  resolved: "Resolved",
  dismissed: "Dismissed",
  superseded: "Superseded",
};

export const revisionChangeLabels: Record<Revision["changeType"], string> = {
  create: "New application",
  update: "App update",
  archive: "Removal request",
};

export const publishActionLabels: Record<Revision["changeType"], string> = {
  create: "Publish new application",
  update: "Publish app update",
  archive: "Archive application",
};
