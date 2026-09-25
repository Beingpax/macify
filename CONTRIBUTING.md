# Contribute to Macify

You can propose a Mac app you built or recommend one that is not yet listed. Each pull request may add **one new app or one new deal**, with no other file changes. For corrections to an existing listing or changes to the site, [open an issue](https://github.com/Beingpax/macify/issues/new/choose) first.

## What we accept

- Apps that have been publicly available for at least **30 days** and offer a meaningful Mac experience.
- Useful, original apps with reliable core features, thoughtful design, and active maintenance.
- Listings backed by current official information about downloads, pricing, privacy, support, and macOS compatibility.

We do not accept unfinished or generic apps, close copies without meaningful original work, misleading claims, hidden pricing, malware, impersonation, or rights violations. The site owner decides what is published and assigns Featured and Editor's Pick status. Public submissions may omit `isFeatured` and `isEditorsPick` or set them to `false`; `true` is rejected.

## Submit an app

1. Check [`catalog/apps`](catalog/apps) to make sure the app is not already listed.
2. Fork the repository. Copy the [app example](catalog/examples/application.example.json) to `catalog/apps/<app-slug>.json` and fill it in using official sources. Include a clear description and public HTTPS links to authentic artwork; do not add image files to the repository.
3. Run `npm run catalogue:validate` and fix any errors.
4. Open a pull request containing **only that new app file**. Explain why the app belongs in Macify and link the official sources you used.

## Submit a deal

For an app already in the directory, copy the [deal example](catalog/examples/deal.example.json) to `catalog/deals/<app-slug>.json`. Use the app's existing slug and verify the offer, discount, dates, and eligibility against an official source. Run `npm run catalogue:validate`, then open a pull request containing **only the new deal file** and a link to that source.

## Review

Initial review may take up to **seven days**. We may request changes or decline a proposal. Submission does not guarantee publication; the site owner makes the final decision.
