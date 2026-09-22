# Marketplace listing draft

Draft prepared on 2026-09-22 for the user's existing Notion connection.

Latest listing status reported by the user on 2026-09-22: they submitted the listing and
provided a screenshot showing **Skills / Awaiting approval**. The starter
catalog, shared policy footer, and review-draft `/privacy` and `/terms` pages are
now deployed at https://skills.inlevel9.com. Both policy pages and their footer
links were verified in production. Marketplace approval has not been rechecked.
Policy adoption remains unfinished; publishing the draft pages does not resolve it.

On 2026-09-23, the existing deployment completed a real OAuth callback, Skills API
listing, and verification archive download. See
[verification evidence](decision-guide-verification.md). The new decision-guide
catalog changes remain local and were not deployed during this verification.

## Historical draft-preparation notes

The notes below record the earlier preparation state, before submission and the
production checks above. Their deployment and submission statements are historical.

- Form: https://app.notion.com/profile/connections/form/new?integrationId=3e3d872b-594c-811e-bc79-00378bdc7883
- Existing connection name: Notion Skills (preserved).
- Publisher: INLEVEL9.
- Contact: contact@inlevel9.com, matching the existing public INLEVEL9 terms.
- Website: https://skills.inlevel9.com
- Installation entry: https://skills.inlevel9.com/auth/notion
- Privacy: https://skills.inlevel9.com/privacy
- Reserved terms URL: https://skills.inlevel9.com/terms
- Proposed listing slug: inlevel9-skills.
- Feature: Import.
- Existing categories: Collaboration, File management, Productivity.

Saved in Notion on 2026-09-22. The UI reported that the connection listing was
saved; reloading the form retained the description, getting-started copy,
categories, developer details, policy URLs, and gallery image. The form remains
an editable draft and was not submitted for review.

`docs/marketplace/catalog-preview.png` is an actual screenshot of the local
starter catalog attached to the draft. It does not demonstrate an authenticated
Notion connection. Add a real connection walkthrough after OAuth verification.
`docs/marketplace/privacy-draft-preview.png` is a local review screenshot only.

The listing describes the service as being prepared for release. The public
deployment does not yet contain the starter catalog, and the OAuth connection
has not been verified end to end. Do not submit this draft as a ready product.
Before submission, update the status wording to reflect the actually released
features and confirm every public URL.

## Terms adaptation

Reference: https://inlevel9.com/terms (reviewed 2026-09-22; source displayed an
update date of 2026-08-23). `web/terms.ts` is a service-specific review draft,
not a statement that the terms have already taken effect or been published.

- Retained the publicly displayed operator identity and support contact.
- Replaced newsletter, membership, checkout, and comment provisions with the
  actual catalog, local request composer, download, and Notion OAuth features.
- Described current absence of billing; future paid features require separate
  disclosure and consent.
- Proposed explicit permission for ordinary business use, AI input, and local
  customization of first-party skills. Copying the newsletter's prohibition on
  commercial use and AI input would contradict the purpose of this product.
- Distinguished user-owned Notion content from first-party starter skills.
- Did not carry over a payment-based liability cap to the currently free service.
- Left the effective date undecided and displayed a review-draft notice.

The operator must review the usage grant, distribution conditions, and effective
date before adopting and publishing the terms. No legal adequacy determination
is implied by preparing this draft.

## Privacy adaptation

Reference: https://inlevel9.com/privacy (reviewed 2026-09-22; source displayed an
update date of 2026-09-05). `web/privacy.ts` replaces the short data notice with a
service-specific review draft. It is not yet deployed or effective.

- Retained the public operator and privacy contact, rights request channel, and
  change-notice structure.
- Documented actual processing in `web/app.ts`, `web/notion.ts`,
  `web/session.ts`, and `public/catalog.js`: browser-only input composition,
  URL-based catalog search, minimal OAuth session data, and direct downloads.
- Distinguished the ten-minute OAuth state cookie from the eight-hour session,
  and cookie deletion from revocation of Notion access.
- Excluded newsletter, billing, advertising, and analytics integrations that
  this web service does not use.
- Distinguished provider responses processed transiently from values retained
  in encrypted cookies. No email/profile directory or refresh-token store exists.
- Left provider log retention, email inquiry retention, and precise overseas
  processing disclosures as explicit unresolved review items. Do not copy the
  newsletter's retention periods or assume provider regions from its policy.
- Before publishing, verify provider contracts, retention, log access and
  callback-query handling, countries, recipients, contact details, transfer
  grounds, timing/method, and withdrawal options against the actual deployment.

## Repository

Local `origin` is connected to https://github.com/oswarld/Notion-skills.git.
GitHub reported the repository as public on 2026-09-22. Connecting the remote
does not publish local changes; no commit or push was performed for this draft.
