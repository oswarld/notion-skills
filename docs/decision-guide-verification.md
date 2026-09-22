# Decision guide verification

Verified on 2026-09-23. The decision-guide changes are local and uncommitted.
No push or deployment was performed for this change.

## Local behavior

All 15 starter skills have a required decision guide containing questions,
criteria, unknown handling, and a Notion-ready output structure. The browser
view, copied request, standalone Markdown, and skill ZIP use that same source.
The site prepares instructions for the user's AI; it does not run a model or
retrieve the user's current Notion page.

Automated checks:

- `npx --yes bun test`: 251 passed, 0 failed, 1,386 assertions across 24 files.
- `npm run typecheck`: passed.
- Skill creator's `quick_validate.py`: all 15 packages passed.
- Local links and image paths in the main, web, and setup READMEs: 20 checked,
  none missing.
- `git diff --check`: passed.

The tests check complete guide propagation for every skill, source/condition
separation, exclusion of hidden drafts in current-page mode, standalone file
completeness, ZIP contents, invalid guides, HTML escaping, and the retired setup
wizard's no-mutation default. Existing mocked OAuth and Skills API tests also pass.

Browser checks at http://127.0.0.1:3000/catalog/meeting-notes:

- Missing pasted material produces a visible validation message.
- Example material and additional criteria produce a complete request.
- The clipboard exactly matches the generated request.
- Switching to current-page mode hides the material field and invalidates the
  old request. The new request excludes the hidden material and keeps the
  audience and additional criteria.
- Current-page mode also works with an otherwise empty form.
- Editing criteria invalidates the old request. Switching back preserves the draft.
- Example insertion refuses to overwrite existing work, including hidden material.
- The module script executes with the existing CSP; no browser console errors
  were reported during these checks.

## Existing production connection

These checks used the already deployed service, not the uncommitted catalog changes:

1. https://skills.inlevel9.com/health returned `{"status":"ready"}`.
2. The OAuth authorization screen showed selected-page read access. It showed
   **INLEVEL9 Skills Verification** as already added. No additional page was selected.
3. Authorization returned through the callback to
   https://skills.inlevel9.com/skills with an authenticated library.
4. The live Skills API listed **OAuth Verification** and **notion-skills-updater**.
5. The **OAuth Verification** download produced `o-auth-verification.tar.gz`
   (536 bytes). Reading the archive without extracting it confirmed `plugin.json`,
   `skills/o-auth-verification/SKILL.md`, and marker
   `INLEVEL9-OAUTH-VERIFICATION-20260922`.

This establishes a real OAuth exchange, an authorized plugin listing, and a
successful Notion archive download. It does not establish access to all
workspaces. Unshared-page denial, revocation, session expiry, and cancellation
were covered by mocked tests and were not repeated against production.

## Evaluation boundary

Authored output previews are explicitly labeled as examples. No Notion AI
response-quality benchmark was run, and the unit tests do not establish an
improvement in model accuracy. A useful manual review should compare the same
material with and without the guide, checking whether proposals stay separate
from decisions, unknown dates stay unknown, totals remain consistent, and the
result preserves the source evidence.

Publishing the new catalog changes remains the owner's next step after review.
Marketplace approval and adoption of the existing policy drafts are separate
operator tasks; this verification does not change their status.
