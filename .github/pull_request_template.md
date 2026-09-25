<!--
Public pull requests may only add one new catalog/apps/<slug>.json or catalog/deals/<slug>.json file and
change nothing else. For bugs, ideas, code, documentation, design, or changes
to an existing listing, open an issue instead.
-->

## Application or deal

Explain what the application or deal offers and why it belongs on Macify.

## Sources

For an application, link official sources for its features, pricing, privacy, requirements, and media. For a deal, link the official offer confirming the discount, code, destination, and availability dates.

## Checklist

- [ ] This pull request adds exactly one new `catalog/apps/<slug>.json` or `catalog/deals/<slug>.json` file and changes nothing else.
- [ ] I followed the [contribution guidelines](../CONTRIBUTING.md), including deal verification when applicable.
- [ ] For an application, `isFeatured` and `isEditorsPick` are `false` or omitted.
- [ ] For an application, I used direct public HTTPS image source URLs and did not commit image binaries.
- [ ] I ran `npm run catalogue:validate` successfully.
