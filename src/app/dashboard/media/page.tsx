import Image from "next/image";
import { getMediaManagementData } from "@/lib/dashboard/dashboard-data";

export const dynamic = "force-dynamic";
const labels: Record<string, string> = { icon: "Icon", preview_image: "Main preview", screenshot: "Screenshot" };
const mediaUrl = (key: string) => `/dashboard/media/${key.split("/").map(encodeURIComponent).join("/")}`;
const bytes = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

export default async function MediaPage() {
  const { records, totals } = await getMediaManagementData();
  return (
    <>
      <header className="dashboard-header"><div><p>R2 asset inventory</p><h1>Media</h1></div><div className="dashboard-actions"><span className="storage-summary">{totals.count} files · {bytes(Number(totals.bytes))}</span></div></header>
      <section className="dashboard-panel media-management-panel" aria-labelledby="media-list-heading">
        <div className="panel-toolbar"><div><h2 id="media-list-heading">Stored application media</h2><p>Read-only inventory synchronized from reviewed GitHub manifests.</p></div></div>
        {records.length === 0 ? <div className="dashboard-empty"><h3>No media stored</h3><p>Media appears here after an approved catalogue revision is published.</p></div> : (
          <div className="media-management-grid">
            {records.map((asset) => (
              <article className="media-management-item" key={asset.id}>
                <div className={asset.role === "icon" ? "media-management-preview media-management-icon" : "media-management-preview"}>
                  <Image alt={asset.altText || `${asset.appName ?? "Application"} ${labels[asset.role] ?? "media"}`} fill sizes="(max-width: 720px) 100vw, 280px" src={mediaUrl(asset.storageKey)} unoptimized />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
