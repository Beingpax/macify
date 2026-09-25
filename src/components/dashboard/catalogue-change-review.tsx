import Image from "next/image";
import { Check, Minus, Plus } from "lucide-react";
import type { CataloguePreparedMedia } from "@/db/schema";
import type { CatalogueManifest } from "@/lib/catalogue/catalogue-manifest";
import { createProseDiff, getChangedManifestFields, type CatalogueSnapshot, type DiffPart, type ProseDiffRow } from "@/lib/catalogue/catalogue-diff";
import { formatPricing } from "@/lib/shared/pricing";

type CurrentMedia = {
  id: string;
  role: "icon" | "preview_image" | "screenshot";
  storageKey: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  checksum: string;
  sourceUrl: string | null;
  altText: string | null;
};

type CurrentReview = CatalogueSnapshot & {
  id: string;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  isEditorsPick: boolean;
  media: CurrentMedia[];
};

const fieldLabels = {
  name: "Name",
  slug: "URL slug",
  website: "Website",
  tagline: "Tagline",
  pricing: "Pricing",
  source: "Source",
  video: "Video",
  featured: "Featured",
  editorsPick: "Editor’s Pick",
  categories: "Categories",
  related: "Related applications",
} as const;

export function CatalogueChangeReview({ current, manifest, preparedMedia }: {
  current: CurrentReview | null;
  manifest: CatalogueManifest;
  preparedMedia: CataloguePreparedMedia[];
}) {
  const changes = getChangedManifestFields(current, manifest);
  const fieldRows = [
    { key: "name" as const, before: current?.name, after: manifest.name },
    { key: "slug" as const, before: current?.slug, after: manifest.slug },
    { key: "website" as const, before: current?.websiteUrl, after: manifest.websiteUrl },
    { key: "tagline" as const, before: current?.tagline, after: manifest.tagline },
    { key: "pricing" as const, before: current ? formatPricing(current) : undefined, after: formatPricing(manifest) },
    { key: "source" as const, before: current ? sourceLabel(current.sourceType) : undefined, after: sourceLabel(manifest.sourceType) },
    { key: "video" as const, before: current?.youtubeUrl ?? undefined, after: manifest.youtubeUrl ?? undefined },
    ...(!current ? [
      { key: "featured" as const, before: undefined, after: yesNo(manifest.isFeatured) },
      { key: "editorsPick" as const, before: undefined, after: yesNo(manifest.isEditorsPick) },
    ] : []),
    { key: "categories" as const, before: current?.categories, after: manifest.categories },
    { key: "related" as const, before: current?.relatedAppSlugs, after: manifest.relatedAppSlugs },
  ];
  const mediaRows = pairMedia(current?.media ?? [], preparedMedia);
  const mediaChangeCount = mediaRows.filter(({ state }) => state !== "unchanged").length;

  return (
    <>
      <section className="catalogue-review-section" id="listing-changes">
        <div className="catalogue-review-heading">
          <div>
            <p className="section-kicker">Listing fields</p>
            <h2>{current ? "What changed" : "New application information"}</h2>
            <p>{current ? "Previous public values are shown beside the proposed GitHub values." : "Every value below will be created when this revision is published."}</p>
          </div>
          <strong className="catalogue-review-count">{changes.size} changed</strong>
        </div>
        <div className="catalogue-field-diff" role="table" aria-label="Application field changes">
          <div className="catalogue-field-diff-head" role="row">
            <span role="columnheader">Field</span>
            <span role="columnheader">Previous</span>
            <span role="columnheader">Proposed</span>
          </div>
          {fieldRows.map((field) => (
            <div className="catalogue-field-diff-row" data-changed={changes.has(field.key)} key={field.key} role="row">
              <div className="catalogue-field-name" role="rowheader">
                <strong>{fieldLabels[field.key]}</strong>
                <span>{changes.has(field.key) ? current ? "Changed" : "New" : "Unchanged"}</span>
              </div>
              <DiffValue state={changes.has(field.key) ? "removed" : "unchanged"} value={field.before} />
              <DiffValue state={changes.has(field.key) ? "added" : "unchanged"} value={field.after} />
            </div>
          ))}
        </div>
      </section>

      <DescriptionDiff before={current?.description ?? ""} isNew={!current} proposed={manifest.description} />

      <section className="catalogue-review-section" id="media-changes">
        <div className="catalogue-review-heading">
          <div>
            <p className="section-kicker">Media</p>
            <h2>Stored asset comparison</h2>
            <p>Optimized R2 files are compared by role, checksum, source, and alt text.</p>
          </div>
          <strong className="catalogue-review-count">{mediaChangeCount} changed · {preparedMedia.length} proposed</strong>
        </div>
        <div className="catalogue-media-diff">
          {mediaRows.map((row, index) => (
            <article className="catalogue-media-diff-row" data-state={row.state} key={`${row.role}-${index}`}>
              <div className="catalogue-media-diff-label">
                <span>{roleLabel(row.role)}</span>
                <strong>{changeLabel(row.state)}</strong>
              </div>
              <MediaCell asset={row.before} label="Previous" state={row.state === "unchanged" ? "unchanged" : "removed"} />
              <MediaCell asset={row.after} label="Proposed" state={row.state === "unchanged" ? "unchanged" : "added"} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function DescriptionDiff({ before, proposed, isNew }: { before: string; proposed: string; isNew: boolean }) {
  const rows = createProseDiff(before, proposed);
  const changedRows = rows.filter(({ state }) => state !== "unchanged").length;
  const displayRows = collapseUnchangedRows(rows);
  return (
    <section className="catalogue-review-section" id="description-changes">
      <div className="catalogue-review-heading">
        <div>
          <p className="section-kicker">Description</p>
          <h2>Prose changes by block</h2>
          <p>Paragraphs, headings, and list items are aligned so editorial changes read naturally.</p>
        </div>
        <strong className="catalogue-review-count">{isNew ? "New description" : `${changedRows} blocks changed`}</strong>
      </div>
      <div className="prose-diff" aria-label="Description changes">
        <div className="prose-diff-head"><span>Previous</span><span>Proposed</span></div>
        {displayRows.map((item, index) => item.type === "row"
          ? <ProseRow key={`${item.row.state}-${index}`} row={item.row} />
          : (
            <details className="prose-diff-collapsed" key={`collapsed-${index}`}>
              <summary>{item.rows.length} unchanged blocks hidden</summary>
              {item.rows.map((row, rowIndex) => <ProseRow key={rowIndex} row={row} />)}
            </details>
          ))}
      </div>
    </section>
  );
}

function ProseRow({ row }: { row: ProseDiffRow }) {
  return (
    <div className="prose-diff-row" data-state={row.state}>
      <ProseCell blockKind={row.before?.kind} blockLabel={row.before?.label} parts={row.beforeParts} side="before" state={row.state} />
      <ProseCell blockKind={row.after?.kind} blockLabel={row.after?.label} parts={row.afterParts} side="after" state={row.state} />
    </div>
  );
}

function ProseCell({ blockKind, blockLabel, parts, side, state }: {
  blockKind?: string;
  blockLabel?: string;
  parts: DiffPart[];
  side: "before" | "after";
  state: "unchanged" | "added" | "removed" | "changed";
}) {
  const isEmpty = parts.length === 0;
  const Mark = state === "unchanged" ? Check : side === "before" ? Minus : Plus;
  return (
    <div className="prose-diff-cell" data-kind={blockKind} data-side={side}>
      {blockLabel && <span className="prose-block-label"><Mark aria-hidden="true" size={12} /> {blockLabel}</span>}
      {isEmpty ? <span className="prose-diff-empty">No block</span> : (
        <p className={state === "unchanged" ? "prose-diff-unchanged" : undefined}>
          {parts.map((part, index) => part.type === "removed"
            ? <del key={index}>{part.value}</del>
            : part.type === "added"
              ? <ins key={index}>{part.value}</ins>
              : <span key={index}>{part.value}</span>)}
        </p>
      )}
    </div>
  );
}

function collapseUnchangedRows(rows: ProseDiffRow[]) {
  const output: Array<{ type: "row"; row: ProseDiffRow } | { type: "collapsed"; rows: ProseDiffRow[] }> = [];
  let index = 0;
  while (index < rows.length) {
    if (rows[index].state !== "unchanged") {
      output.push({ type: "row", row: rows[index] });
      index += 1;
      continue;
    }
    let end = index;
    while (end < rows.length && rows[end].state === "unchanged") end += 1;
    const run = rows.slice(index, end);
    if (run.length <= 3) run.forEach((row) => output.push({ type: "row", row }));
    else {
      output.push({ type: "row", row: run[0] });
      output.push({ type: "collapsed", rows: run.slice(1, -1) });
      output.push({ type: "row", row: run.at(-1)! });
    }
    index = end;
  }
  return output;
}

function DiffValue({ value, state }: { value: string | string[] | undefined; state: "unchanged" | "added" | "removed" }) {
  const values = Array.isArray(value) ? value : null;
  return (
    <div className="catalogue-field-value" data-state={state} role="cell">
      {values ? values.length > 0
        ? <div className="catalogue-token-list">{values.map((item) => <span key={item}>{item}</span>)}</div>
        : <span className="catalogue-empty-value">None</span>
        : value
          ? <span>{value}</span>
          : <span className="catalogue-empty-value">Not set</span>}
    </div>
  );
}

function MediaCell({ asset, label, state }: {
  asset: CurrentMedia | CataloguePreparedMedia | null;
  label: string;
  state: "unchanged" | "added" | "removed";
}) {
  return (
    <div className="catalogue-media-cell" data-state={state}>
      <span className="catalogue-media-side">{label}</span>
      {asset ? (
        <>
          <div className={asset.role === "icon" ? "catalogue-media-preview catalogue-media-preview-icon" : "catalogue-media-preview"}>
            <Image alt={asset.altText ?? "Application media"} height={asset.height ?? 360} src={mediaUrl(asset.storageKey)} unoptimized width={asset.width ?? 640} />
          </div>
          <dl>
            <div><dt>Alt text</dt><dd>{asset.altText || "Not set"}</dd></div>
            <div><dt>File</dt><dd>{asset.mimeType} · {formatBytes(asset.byteSize)}</dd></div>
            <div><dt>Source</dt><dd>{asset.sourceUrl || "Not recorded"}</dd></div>
          </dl>
        </>
      ) : <div className="catalogue-media-empty">No asset</div>}
    </div>
  );
}

function pairMedia(current: CurrentMedia[], prepared: CataloguePreparedMedia[]) {
  const roles = ["icon", "preview_image", "screenshot"] as const;
  return roles.flatMap((role) => {
    const before = current.filter((asset) => asset.role === role);
    const after = prepared.filter((asset) => asset.role === role);
    return Array.from({ length: Math.max(before.length, after.length) }, (_, index) => {
      const oldAsset = before[index] ?? null;
      const newAsset = after[index] ?? null;
      const state = !oldAsset ? "added" : !newAsset ? "removed" : mediaEqual(oldAsset, newAsset) ? "unchanged" : "changed";
      return { role, before: oldAsset, after: newAsset, state } as const;
    });
  });
}

function mediaEqual(before: CurrentMedia, after: CataloguePreparedMedia) {
  return before.checksum === after.checksum
    && before.sourceUrl === after.sourceUrl
    && before.altText === after.altText;
}

function mediaUrl(storageKey: string) {
  return `/dashboard/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceLabel(value: "open_source" | "closed_source") {
  return value === "open_source" ? "Open source" : "Closed source";
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function roleLabel(role: "icon" | "preview_image" | "screenshot") {
  return role === "icon" ? "Application icon" : role === "preview_image" ? "Main preview" : "Screenshot";
}

function changeLabel(state: "unchanged" | "added" | "removed" | "changed") {
  return state === "unchanged" ? "Unchanged" : state === "added" ? "Added" : state === "removed" ? "Removed" : "Changed";
}
