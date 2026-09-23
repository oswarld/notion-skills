import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

describe("local setup after retiring Actions", () => {
  test("works without a workflow, CLI credentials, or git checkout and preserves existing settings", () => {
    const cwd = mkdtempSync(join(tmpdir(), "skills-setup-"));
    try {
      const original = "WEB_BASE_URL=https://example.test\n# Preserve this operator file.\n";
      writeFileSync(join(cwd, ".env"), original);
      const result = Bun.spawnSync([process.execPath, cli, "setup"], { cwd, env: { PATH: "" }, stdout: "pipe", stderr: "pipe" });
      expect(result.exitCode).toBe(0);
      const output = new TextDecoder().decode(result.stdout);
      expect(output).toContain("로컬 동기화 설정");
      expect(output).toContain("bun run dry-run");
      expect(readFileSync(join(cwd, ".env"), "utf8")).toBe(original);
      expect(readdirSync(cwd)).toEqual([".env"]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("retired test-run flag fails before creating resources", () => {
    const cwd = mkdtempSync(join(tmpdir(), "skills-setup-"));
    try {
      const result = Bun.spawnSync([process.execPath, cli, "setup", "--test-run"], { cwd, env: { PATH: "" }, stdout: "pipe", stderr: "pipe" });
      expect(result.exitCode).toBe(1);
      expect(new TextDecoder().decode(result.stderr)).toContain("종료된 Actions 설정 마법사");
      expect(readdirSync(cwd)).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
