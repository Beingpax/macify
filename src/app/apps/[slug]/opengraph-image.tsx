import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { mediaUrl } from "@/components/site/public-app-card";
import { getPublishedApplicationBySlug } from "@/lib/directory/published-app-data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const application = await getPublishedApplicationBySlug(slug);
  if (!application) notFound();
  const preview = application.media.find(({ role }) => role === "preview_image");
  const icon = application.media.find(({ role }) => role === "icon");
  const previewSource = preview?.sourceUrl ?? (preview
    ? new URL(`${mediaUrl(preview.storageKey)}?width=1200`, "https://macify.app").toString()
    : null);
  const iconSource = icon?.sourceUrl ?? (icon
    ? new URL(`${mediaUrl(icon.storageKey)}?width=256`, "https://macify.app").toString()
    : null);

  if (previewSource) {
    return new ImageResponse(
      <div style={{ background: "#f6f4f5", display: "flex", height: "100%", width: "100%" }}>
        <img alt="" height={630} src={previewSource} style={{ height: "100%", objectFit: "cover", width: "100%" }} width={1200} />
      </div>,
      size,
    );
  }

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f7f7f5",
        color: "#20111f",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "72px 88px",
        textAlign: "center",
        width: "100%",
      }}
    >
      {iconSource ? <img alt="" height={132} src={iconSource} style={{ borderRadius: 28, height: 132, marginBottom: 34, objectFit: "cover", width: 132 }} width={132} /> : null}
      <div style={{ color: "#1457ff", display: "flex", fontSize: 22, fontWeight: 750, marginBottom: 24 }}>Macify</div>
      <div style={{ display: "flex", fontSize: 72, fontWeight: 850, letterSpacing: "-0.04em", lineHeight: 1 }}>{application.name}</div>
      <div style={{ color: "#555b66", display: "flex", fontSize: 28, lineHeight: 1.4, marginTop: 26, maxWidth: 880 }}>{application.tagline}</div>
    </div>,
    size,
  );
}
