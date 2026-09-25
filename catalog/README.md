# 🗂️ Macify catalogue

This directory contains Macify’s application and deal manifests, contribution templates, and schemas:

- [`apps/`](apps) contains one application manifest per application.
- [`deals/`](deals) contains verified offers for existing applications.
- [`examples/deal.example.json`](examples/deal.example.json) is the deal contribution template.
- [`schema/deal.schema.json`](schema/deal.schema.json) documents the deal format.
- [`examples/application.example.json`](examples/application.example.json) is the contribution template.
- [`schema/application.schema.json`](schema/application.schema.json) documents the manifest format.

Application and deal manifests are reviewed before publication. Merging a contribution does not guarantee inclusion in the public catalogue.

Application manifests may omit `isFeatured` and `isEditorsPick`; omitted values are treated as `false`. Public submissions may not set either field to `true`. They may also omit `relatedAppSlugs` when there are no related applications. A listing can publish before a named related application, and the relationship appears when both are published.

Run `npm run catalogue:validate` before submitting a manifest.

To propose an application or deal, read [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
