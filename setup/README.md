# Local sync setup

`bun run setup` prints configuration instructions for `.env`. It performs no
file edits, database creation, commits, pushes, or GitHub Actions setup.
The web catalog runs independently with `bun run dev`.

Use `bun run dry-run` after configuration, and `bun run sync` only when publishing
changes to the configured destination repository is intended.

## Advanced integration testing

`bun run setup --ci --repo owner/name --db-parent-page <page-id>` is the retained
integration-test runner. It creates a real typed Skills database and sample
pages, writes to the `setup-e2e-test` branch of the destination repository, and
checks sync idempotency. It requires explicit resource-creation authorization
and dedicated test resources. It does not deploy GitHub Actions.

The runner uses `non-interactive.ts`, `skills-db.ts`, `ntn-cli.ts`, and
`verify-sync.ts`. Diagnostic JSONL logs are redacted and stored in the ignored
`.notion-sync-setup/` directory.

`steps/` and `COPY.md` retain the former upstream wizard for reference and helper
tests. They are not called by the current interactive entry point. Their
workflow deployment instructions are historical, not the current setup path.
