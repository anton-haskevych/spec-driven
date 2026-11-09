import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "../../core/frontmatter";
import type { Result } from "../../core/result";

export interface CandidateAssets {
  root: string;
  version: string;
  revision: string;
}

const REQUIRED = [
  ".codex-plugin/plugin.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "scripts/version.py",
  "skills/spec/SKILL.md", "skills/spec/native-entry.md", "skills/spec/capabilities.md", "skills/spec/taxonomy.md",
  "skills/spec/execute.md", "skills/spec/resume.md", "skills/spec/update.md", "skills/spec/handoff.md", "skills/spec/status.md",
  "skills/spec/scripts/spec-bump.sh",
  "skills/spec/tools/codex.ts", "skills/spec/tools/spec.ts", "skills/spec/tools/runtime/codex/entry.ts",
];

export function inspectCandidate(path: string): Result<CandidateAssets> {
  try {
    const root = realpathSync(path);
    const manifest: unknown = JSON.parse(readFileSync(join(root, ".codex-plugin/plugin.json"), "utf8"));
    if (!isRecord(manifest) || manifest.name !== "spec-driven" || manifest.skills !== "./skills/" || typeof manifest.version !== "string" || !manifest.version) {
      return { ok: false, reason: "invalid native candidate manifest" };
    }
    const paths = new Set(REQUIRED);
    for (const pattern of ["skills/**/*", "agents/*.md"]) {
      for (const file of new Bun.Glob(pattern).scanSync({ cwd: root })) {
        if (!file.startsWith("skills/spec/tools/tests/")) paths.add(file);
      }
    }
    const hash = new Bun.CryptoHasher("sha256");
    for (const file of [...paths].sort()) {
      const bytes = readFileSync(join(root, file));
      hash.update(`${file}\0${bytes.length}\0`);
      hash.update(bytes);
    }
    return { ok: true, value: { root, version: manifest.version, revision: `sha256:${hash.digest("hex")}` } };
  } catch {
    return { ok: false, reason: "candidate assets missing or unreadable; start a fresh session with the complete candidate" };
  }
}
