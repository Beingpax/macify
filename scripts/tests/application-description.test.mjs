import assert from "node:assert/strict";
import test from "node:test";
import { descriptionParts } from "../../src/lib/shared/application-description.ts";

test("keeps introductory text and a what-it-does section", () => {
  const result = descriptionParts("Introduction.\n\n## What it does\n\nMore information.\n\n## Features\n\nFeature details.", "A useful tool", "Example");
  assert.match(result.lead, /Introduction/);
  assert.match(result.lead, /More information/);
  assert.deepEqual(result.sections, [{ title: "Features", body: "Feature details." }]);
});

test("retains the heading when the description begins with a named section", () => {
  assert.deepEqual(descriptionParts("## Features\n\nAll the features.", "Useful", "Example"), {
    lead: "", sections: [{ title: "Features", body: "All the features." }],
  });
});

test("keeps section order and content after the first named section", () => {
  const result = descriptionParts("## Features\n\nFirst.\n\n## What Example does\n\nSecond.", "Useful", "Example");
  assert.deepEqual(result.sections.map(({ body }) => body), ["First.", "Second."]);
});

test("removes a repeated tagline heading without dropping its prose", () => {
  const result = descriptionParts("Intro.\n\n## A useful tool.\n\nAdditional detail.", "A useful tool", "Example");
  assert.equal(result.lead, "Intro.\n\nAdditional detail.");
});
