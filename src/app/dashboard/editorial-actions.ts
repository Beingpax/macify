"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apps } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { invalidatePublicCatalogueCache } from "@/lib/shared/public-cache";

function invalidatePublicCataloguePaths() {
  invalidatePublicCatalogueCache();
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/categories", "layout");
  revalidatePath("/apps/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

export async function setFeaturedApplication(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ appId: z.uuid(), featured: z.enum(["true", "false"]) }).safeParse({
    appId: formData.get("appId"), featured: formData.get("featured"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid-featured");
  const featured = parsed.data.featured === "true";
  const database = await getDatabase();
  const row = await database.select({ slug: apps.slug, status: apps.status }).from(apps)
    .where(and(eq(apps.id, parsed.data.appId), isNull(apps.deletedAt))).limit(1);
  if (!row[0]) redirect("/dashboard");
  if (featured && row[0].status !== "published") {
    redirect(`/dashboard/apps/${parsed.data.appId}/edit?featureError=not-published`);
  }
  const updated = await database.update(apps).set({ isFeatured: featured, featuredAt: featured ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(apps.id, parsed.data.appId), isNull(apps.deletedAt), featured ? eq(apps.status, "published") : undefined))
    .returning({ id: apps.id });
  if (!updated.length) redirect(`/dashboard/apps/${parsed.data.appId}/edit?featureError=not-published`);
  invalidatePublicCataloguePaths();
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/apps/${row[0].slug}`);
  redirect(`/dashboard/apps/${parsed.data.appId}/edit?featured=1`);
}

export async function setEditorsPickApplication(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ appId: z.uuid(), editorsPick: z.enum(["true", "false"]) }).safeParse({
    appId: formData.get("appId"), editorsPick: formData.get("editorsPick"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid-editors-pick");
  const editorsPick = parsed.data.editorsPick === "true";
  const database = await getDatabase();
  const row = await database.select({ slug: apps.slug, status: apps.status }).from(apps)
    .where(and(eq(apps.id, parsed.data.appId), isNull(apps.deletedAt))).limit(1);
  if (!row[0]) redirect("/dashboard");
  if (editorsPick && row[0].status !== "published") {
    redirect(`/dashboard/apps/${parsed.data.appId}/edit?editorsPickError=not-published`);
  }
  const updated = await database.update(apps).set({ isEditorsPick: editorsPick, updatedAt: new Date() })
    .where(and(eq(apps.id, parsed.data.appId), isNull(apps.deletedAt), editorsPick ? eq(apps.status, "published") : undefined))
    .returning({ id: apps.id });
  if (!updated.length) redirect(`/dashboard/apps/${parsed.data.appId}/edit?editorsPickError=not-published`);
  invalidatePublicCataloguePaths();
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/apps/${row[0].slug}`);
  redirect(`/dashboard/apps/${parsed.data.appId}/edit?editorsPick=1`);
}

export async function setApplicationPublication(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ appId: z.uuid(), intent: z.enum(["publish", "unpublish"]) }).safeParse({
    appId: formData.get("appId"), intent: formData.get("intent"),
  });
  if (!parsed.success) redirect("/dashboard?error=invalid-publication");
  const database = await getDatabase();
  const applicationRows = await database.select({ slug: apps.slug }).from(apps)
    .where(and(eq(apps.id, parsed.data.appId), isNull(apps.deletedAt))).limit(1);
  const application = applicationRows[0];
  if (!application) redirect("/dashboard");
  const now = new Date();
  await database.update(apps).set(parsed.data.intent === "publish" ? {
    status: "published",
    publishedAt: sql`coalesce(${apps.publishedAt}, ${now.getTime()})`,
    updatedAt: now,
  } : {
    status: "archived",
    isFeatured: false,
    isEditorsPick: false,
    featuredAt: null,
    updatedAt: now,
  }).where(and(eq(apps.id, parsed.data.appId), isNull(apps.deletedAt)));
  invalidatePublicCataloguePaths();
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/apps/${application.slug}`);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/apps/${parsed.data.appId}`);
  redirect(`/dashboard/apps/${parsed.data.appId}/edit?publication=${parsed.data.intent}`);
}
