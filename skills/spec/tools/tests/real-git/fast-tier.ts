import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fastTierArgs, TRIPWIRE_BIN, TRIPWIRE_LOG_ENV, tripwireReport } from "./tripwire";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..", "..", "..");

// The log lives outside skills/: codex-entry hashes that folder.
const logDir = mkdtempSync(join(tmpdir(), "spec-git-tripwire-"));
const log = join(logDir, "calls.log");
try {
  const child = Bun.spawnSync([process.execPath, ...fastTierArgs(process.argv.slice(2))], {
    cwd: REPO_ROOT,
    env: { ...process.env, PATH: `${TRIPWIRE_BIN}:${process.env.PATH ?? ""}`, [TRIPWIRE_LOG_ENV]: log },
    stdio: ["inherit", "inherit", "inherit"],
  });
  const report = tripwireReport(readTextOrEmpty(log));
  if (report) console.error(`\n${report}`);
  process.exitCode = report ? 1 : (child.exitCode ?? 1);
} finally {
  rmSync(logDir, { recursive: true, force: true });
}

function readTextOrEmpty(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
