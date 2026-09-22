import { runNonInteractive } from "./non-interactive.ts";

export interface SetupOptions {
  notionEnv?: string;
  ci?: boolean;
  /** Deprecated flag; rejected before any resources are created. */
  testRun?: boolean;
  // Non-interactive overrides
  githubRepo?: string;
  dbName?: string;
  parentPageId?: string;
}

/** Default setup is local guidance; it never recreates the retired Action. */
export async function runSetup(opts: SetupOptions = {}): Promise<void> {
  if (opts.testRun) {
    throw new Error("--test-run belonged to the retired Actions wizard. Use local configuration and bun run dry-run.");
  }
  if (opts.ci) {
    await runNonInteractive(opts);
    return;
  }
  console.log(`Local Notion skills sync setup

1. Copy .env.example to .env only if .env does not already exist.
2. Set NOTION_API_TOKEN to a connection token with Read content access to a typed Skills database.
3. Set GITHUB_REPO to the destination owner/repository. GITHUB_BRANCH defaults to main.
4. Set GITHUB_TOKEN with destination write access, or authenticate with gh auth login.
5. Run bun run dry-run and inspect the proposed changes.
6. Run bun run sync only when you intend to publish those changes to GitHub.

This command did not create a database, edit .env, commit, push, or configure GitHub Actions.
Database setup: AGENTS.md
All settings: .env.example
Notion connections: https://app.notion.com/developers/connections

The browser catalog needs none of these sync settings: run bun run dev.
Advanced integration testing is available through setup --ci and creates real Notion/GitHub resources.`);
}
