import type { CatalogueManifest } from "@/lib/catalogue/catalogue-manifest";

export type DiffPart = {
  type: "equal" | "added" | "removed";
  value: string;
};

type ProseBlock = {
  kind: "heading" | "paragraph" | "list" | "quote" | "code";
  label: string;
  text: string;
};

export type ProseDiffRow = {
  before: ProseBlock | null;
  after: ProseBlock | null;
  state: "unchanged" | "added" | "removed" | "changed";
  beforeParts: DiffPart[];
  afterParts: DiffPart[];
};

export type CatalogueSnapshot = Pick<
  CatalogueManifest,
  | "name"
  | "slug"
  | "websiteUrl"
  | "tagline"
  | "description"
  | "pricingType"
  | "billingType"
  | "pricingDetails"
  | "sourceType"
  | "youtubeUrl"
  | "isFeatured"
  | "isEditorsPick"
> & {
  categories: string[];
  relatedAppSlugs: string[];
};

type ManifestFieldKey =
  | "name"
  | "slug"
  | "website"
  | "tagline"
  | "pricing"
  | "source"
  | "video"
  | "featured"
  | "editorsPick"
  | "categories"
  | "related"
  | "description";

const MAX_MATRIX_CELLS = 50_000;

export function getChangedManifestFields(current: CatalogueSnapshot | null, proposed: CatalogueManifest) {
  if (!current) {
    const fields = new Set<ManifestFieldKey>([
      "name", "slug", "website", "tagline", "pricing", "source", "video", "categories", "related", "description",
    ]);
    fields.add("featured");
    fields.add("editorsPick");
    return fields;
  }

  const changed = new Set<ManifestFieldKey>();
  if (current.name !== proposed.name) changed.add("name");
  if (current.slug !== proposed.slug) changed.add("slug");
  if (current.websiteUrl !== proposed.websiteUrl) changed.add("website");
  if (current.tagline !== proposed.tagline) changed.add("tagline");
  if (
    current.pricingType !== proposed.pricingType
    || current.billingType !== proposed.billingType
    || current.pricingDetails !== proposed.pricingDetails
  ) changed.add("pricing");
  if (current.sourceType !== proposed.sourceType) changed.add("source");
  if (current.youtubeUrl !== proposed.youtubeUrl) changed.add("video");
  if (!sameSet(current.categories, proposed.categories)) changed.add("categories");
  if (!sameSet(current.relatedAppSlugs, proposed.relatedAppSlugs)) changed.add("related");
  if (current.description !== proposed.description) changed.add("description");
  return changed;
}

export function createProseDiff(before: string, after: string): ProseDiffRow[] {
  const oldBlocks = splitMarkdownBlocks(before);
  const newBlocks = splitMarkdownBlocks(after);
  const operations = diffSequence(oldBlocks, newBlocks, (left, right) => blockKey(left) === blockKey(right));
  const rows: ProseDiffRow[] = [];
  let pendingRemoved: ProseBlock[] = [];
  let pendingAdded: ProseBlock[] = [];

  const flushChanges = () => {
    const length = Math.max(pendingRemoved.length, pendingAdded.length);
    for (let index = 0; index < length; index += 1) {
      const removed = pendingRemoved[index] ?? null;
      const added = pendingAdded[index] ?? null;
      const parts = removed && added
        ? createWordDiff(removed.text, added.text)
        : { before: removed ? [{ type: "removed" as const, value: removed.text }] : [], after: added ? [{ type: "added" as const, value: added.text }] : [] };
      rows.push({
        before: removed,
        after: added,
        state: removed && added ? "changed" : removed ? "removed" : "added",
        beforeParts: parts.before,
        afterParts: parts.after,
      });
    }
    pendingRemoved = [];
    pendingAdded = [];
  };

  for (const operation of operations) {
    if (operation.type === "removed") pendingRemoved.push(operation.value);
    if (operation.type === "added") pendingAdded.push(operation.value);
    if (operation.type === "equal") {
      flushChanges();
      rows.push({
        before: operation.value,
        after: operation.value,
        state: "unchanged",
        beforeParts: [{ type: "equal", value: operation.value.text }],
        afterParts: [{ type: "equal", value: operation.value.text }],
      });
    }
  }
  flushChanges();
  return rows;
}

function splitMarkdownBlocks(markdown: string): ProseBlock[] {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", label: "Paragraph", text });
    paragraph = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      flushParagraph();
      if (code) {
        code.push(line);
        blocks.push({ kind: "code", label: "Code block", text: code.join("\n") });
        code = null;
      } else {
        code = [line];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", label: `Heading ${heading[1].length}`, text: heading[2].trim() });
      continue;
    }
    const list = line.match(/^\s*(?:[-*+] |\d+\. )(.+)$/);
    if (list) {
      flushParagraph();
      blocks.push({ kind: "list", label: "List item", text: list[1].trim() });
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ kind: "quote", label: "Quote", text: quote[1].trim() });
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  if (code?.length) blocks.push({ kind: "code", label: "Code block", text: code.join("\n") });
  return blocks;
}

function createWordDiff(before: string, after: string) {
  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  const operations = diffSequence(beforeTokens, afterTokens, (left, right) => left === right);
  const beforeParts: DiffPart[] = [];
  const afterParts: DiffPart[] = [];
  for (const operation of operations) {
    if (operation.type !== "added") appendPart(beforeParts, operation.type, operation.value);
    if (operation.type !== "removed") appendPart(afterParts, operation.type, operation.value);
  }
  return { before: beforeParts, after: afterParts };
}

function tokenize(value: string) {
  return value.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

function appendPart(parts: DiffPart[], type: DiffPart["type"], value: string) {
  const previous = parts.at(-1);
  if (previous?.type === type) previous.value += value;
  else parts.push({ type, value });
}

function diffSequence<T>(before: T[], after: T[], equal: (left: T, right: T) => boolean) {
  type Operation = { type: "equal" | "added" | "removed"; value: T };
  if (before.length * after.length > MAX_MATRIX_CELLS) {
    return [
      ...before.map((value): Operation => ({ type: "removed", value })),
      ...after.map((value): Operation => ({ type: "added", value })),
    ];
  }
  const matrix = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      matrix[left][right] = equal(before[left], after[right])
        ? matrix[left + 1][right + 1] + 1
        : Math.max(matrix[left + 1][right], matrix[left][right + 1]);
    }
  }
  const operations: Operation[] = [];
  let left = 0;
  let right = 0;
  while (left < before.length && right < after.length) {
    if (equal(before[left], after[right])) {
      operations.push({ type: "equal", value: before[left] });
      left += 1;
      right += 1;
    } else if (matrix[left + 1][right] >= matrix[left][right + 1]) {
      operations.push({ type: "removed", value: before[left] });
      left += 1;
    } else {
      operations.push({ type: "added", value: after[right] });
      right += 1;
    }
  }
  while (left < before.length) operations.push({ type: "removed", value: before[left++] });
  while (right < after.length) operations.push({ type: "added", value: after[right++] });
  return operations;
}

function blockKey(block: ProseBlock) {
  return `${block.kind}:${block.text.replace(/\s+/g, " ").trim()}`;
}

function sameSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}
