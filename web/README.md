# INLEVEL9 Skills browser service

Production website: https://skills.inlevel9.com

Production OAuth callback: https://skills.inlevel9.com/auth/notion/callback

This is a separate entry point alongside the existing Bun CLI. It uses native
Request/Response handlers and server-rendered HTML, without a frontend framework,
database, analytics SDK, or additional runtime dependencies.

## Starter skill flow

1. Open `/catalog`, search by job, and optionally filter audience and category.
2. Open a skill to see required inputs and a clearly labeled authored example.
3. For every starter skill, inspect the decision questions,
   criteria, unknown handling, and output structure. Optionally add work-specific
   priorities or terminology separately from the source material.
4. Paste material, try the example, or select the current Notion page. Compose and copy a request.
5. Paste into Notion AI or another existing AI conversation, or download an individual skill ZIP
   for installation in a compatible app such as Claude.

No model runs on this site. Input text is combined in browser memory and is not
submitted, persisted in local storage, or sent to an external API. Search terms
are GET parameters and can appear in browser history or hosting logs. The copy
button has a selection fallback when the clipboard API is unavailable. Editing
inputs or additional criteria invalidates the old request so users do not copy stale material.

The source instructions live in `skills/<name>/SKILL.md`; presentation metadata
is in `catalog-data.ts`. Files are loaded only for predefined catalog IDs, and
`vercel.json` includes them in the function bundle. The existing `fflate`
dependency produces each ZIP; no new runtime dependency was introduced.

All 15 decision guides live in `skills/<name>/references/decision-guide.yaml`.
Every authored catalog entry requires this fixed reference path.
The loader validates each question's criteria and unknown handling, then uses
the same reference for the rendered UI, inline prompt instructions, and ZIP.
The ZIP contains the original `SKILL.md` and its reference. Single-file Markdown
downloads and composed requests inline the guide and remove the local file link.
`public/catalog.js` exports the tested, pure `composeRequest` function and initializes
the DOM separately. Its module script makes no network calls. Current-page mode
excludes the first (possibly populated but hidden) material field while retaining
user-authored audience/work conditions. Changing mode or criteria invalidates the
old request. The site does not retrieve the current Notion page.

## Notion user flow

1. Open the service and choose **Connect with Notion**.
2. Approve the public connection and select Skills databases in Notion.
3. View only the plugin bundles visible to that user's connection.
4. Download a bundle directly from Notion's temporary archive URL.

The archive is Notion's original `.tar.gz`, including `SKILL.md` and attachments.
It is not an automatic installation into an agent app. The CLI marketplace sync
is unchanged and remains separately configured.

Notion requests use `Notion-Version: 2026-03-11`. Listing requests ask for 100
plugins per page and fail on incomplete or malformed pagination. Plugin IDs are
treated as opaque strings and encoded for download routes. Each Notion **Tags**
value groups skills into a plugin; an untagged skill becomes its own plugin.
A bundle contains at most 100 skills (the most recently updated when there are
more), per the [get-plugin API](https://developers.notion.com/reference/agent-skills/get-plugin-directory).
The connection needs **Read content**; skills not shared with it are omitted.

## Operator registration

Create a dedicated connection at https://app.notion.com/developers/connections:

- Name: `INLEVEL9 Skills`.
- Authentication: OAuth.
- Installation scope: Any workspace.
- Redirect URI: `${WEB_BASE_URL}/auth/notion/callback`.
- Capabilities: Read content only; no content writes, comments, or user email.
- Do not modify or rotate an existing unrelated connection.

Connection creation may require accepting Notion's developer terms. The account
owner must authorize that action. Marketplace listing is a separate optional
process; the OAuth authorization URL does not require a marketplace listing.

Configure the following **server-side** environment variables in the deployment:

| Variable | Value |
| --- | --- |
| `WEB_BASE_URL` | `https://skills.inlevel9.com` in production |
| `NOTION_OAUTH_CLIENT_ID` | Public connection client ID |
| `NOTION_OAUTH_CLIENT_SECRET` | Public connection client secret |
| `WEB_SESSION_KEY` | 32 cryptographically random bytes as 64 hex characters |

Generate the encryption key with `openssl rand -hex 32`. Never commit credentials
or expose them in browser code. For development use `.env` (gitignored),
`WEB_BASE_URL=http://localhost:3000`, and register that callback separately.
Configuration remains environment-only; `vercel.json` contains routing/build
instructions, not connection settings.

## Deployment and verification

`/terms` and `/privacy` currently serve review drafts adapted from the existing
INLEVEL9 policies. Confirm the operator's intended terms, effective dates,
provider retention, and overseas processing details before publishing them as
effective policies. See `docs/marketplace-listing.md` for the remaining items.
Both review pages are publicly reachable from the shared footer as of
2026-09-22; they have not been adopted as final policies.

`vercel.json` deploys `api/index.ts` with the existing Bun dependencies and serves
CSS, logo, and the catalog script from `public/`. Run `bun run typecheck` and `bun test` before deploying. The
production origin must match `WEB_BASE_URL` exactly; preview domains cannot
silently become OAuth callbacks.

`GET /health` returns `200 {"status":"ready"}` when settings are present or
`503 {"status":"setup_required"}` otherwise. This is configuration readiness,
not proof that a real OAuth exchange succeeded.

Before announcing the service as ready for users, verify in a real browser:

1. The authorization page shows the correct connection and read-only scope.
2. Consent returns to `/skills` with a Secure, HttpOnly session cookie.
3. A known shared Skills database appears; non-shared content does not.
4. A download contains the expected skill files.
5. Cancellation and revocation behave as described.

The tests exercise the real HTTP handler with a fake Notion transport: state
binding/expiry, encryption tampering, cross-user isolation, XSS, CSRF,
pagination, permission failures, signed downloads, and revocation errors. They
cannot establish workspace Skills API availability or Notion console settings.

On 2026-09-23, the existing production deployment completed a real OAuth
callback, listed the previously shared verification skill, and downloaded an
archive containing its `SKILL.md` and expected marker. The new decision-guide
changes remain local. See [verification evidence](../docs/decision-guide-verification.md)
for the tested behavior and remaining evaluation boundaries.

## Security and data lifecycle

- OAuth code exchange occurs only on the server. `state` is random, expires in
  ten minutes, and is bound to an encrypted cookie in the initiating browser.
- AES-256-GCM cookies bind ciphertext to its purpose and canonical origin.
  Production cookies use `__Host-`, Secure, HttpOnly, SameSite=Lax, and Path=/.
- Sessions expire after eight hours. Only the access token and minimal workspace
  metadata are retained, encrypted in the cookie. Refresh tokens are intentionally
  discarded: there is no unattended web worker or long-lived server token store.
  Expired/revoked Notion access requires a new browser sign-in.
- Logout deletes the local cookie. Disconnect revokes the Notion access token
  before deleting the cookie; a failed revocation is shown as a failure.
- Mutating routes require a same-origin POST. HTML, redirects, and private
  responses are never cached. OAuth pages forbid scripts. Only starter detail
  pages allow same-origin scripts; their CSP blocks network connections and form
  submissions. All pages forbid framing and third-party forms.
- Plugin names/descriptions are escaped. Downloads recheck the current user's
  accessible plugin list before requesting a signed URL from Notion. Archives
  are not downloaded or decompressed on this shared service.
- No Notion content, passwords, or tokens are logged by the application. Hosting
  request logs may still contain IPs and request paths; keep provider access and
  retention restricted. Do not add request URL/query logging to OAuth callbacks.
- Rotating `WEB_SESSION_KEY` invalidates all browser sessions; it does not revoke
  Notion grants. The service has no application database or global token store.

Official references: [Notion public connections](https://developers.notion.com/guides/get-started/public-connections),
[authorization](https://developers.notion.com/guides/get-started/authorization),
[Skills API](https://developers.notion.com/guides/agent-skills/overview), and
[token revocation](https://developers.notion.com/reference/revoke-token).
