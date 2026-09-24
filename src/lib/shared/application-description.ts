type EditorialSection = { title: string; body: string };

function normalize(value: string) {
  return value.replace(/[.!?]+$/, "").trim().toLowerCase();
}

export function descriptionParts(description: string, tagline: string, applicationName: string) {
  const chunks = description.trim().split(/(?=^##\s+)/m).filter(Boolean);
  let lead = "";
  const sections: EditorialSection[] = [];

  for (const chunk of chunks) {
    const heading = chunk.match(/^##\s+(.+)$/m)?.[1]?.trim();
    const body = heading ? chunk.replace(/^##\s+.+\n*/m, "").trim() : chunk.trim();

    if (!heading) {
      lead = [lead, body].filter(Boolean).join("\n\n");
      continue;
    }

    const title = normalize(heading);
    if (title === normalize(tagline) && sections.length === 0) {
      lead = [lead, body].filter(Boolean).join("\n\n");
      continue;
    }

    if ((title === "what it does" || title === `what ${normalize(applicationName)} does`) && sections.length === 0) {
      lead = [lead, body].filter(Boolean).join("\n\n");
      continue;
    }

    sections.push({ title: heading, body });
  }

  return { lead, sections };
}

