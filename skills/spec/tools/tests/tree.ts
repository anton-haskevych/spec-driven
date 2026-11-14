import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { SpecFolder } from "../core/spec-folders";
import type { PhaseDoc } from "../plan/docs/phase-doc";

export interface Tree {
  root: string;
  write(relativePath: string, text: string): string;
  spec(name: string, files: Record<string, string>): SpecFolder;
  cleanup(): void;
}

const MINIMAL_SPEC_META = "---\nstatus: active\n---\n";

export function createTree(prefix = "spec-tree-"): Tree {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const write = (relativePath: string, text: string): string => {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    return path;
  };
  const spec = (name: string, files: Record<string, string>): SpecFolder => {
    for (const [path, text] of Object.entries({ "CLAUDE.md": MINIMAL_SPEC_META, ...files })) {
      write(join("docs/specs", name, path), text);
    }
    return { name, dir: join(root, "docs/specs", name) };
  };
  return { root, write, spec, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// Anything files can be written into: a temp tree or a test repo's working copy.
export interface Writable {
  write(relativePath: string, text: string): unknown;
}

export const JOINED_STUB = "> On the board since 2026-11-11. This list is frozen; the board is the source.\n";

// The board switched on in this checkout's settings, as a joined spec's commands require.
export function withSettings(target: Writable, extra: { people?: readonly string[] } = {}): void {
  const people = extra.people ? `\n  people: [${extra.people.join(", ")}]` : "";
  target.write("docs/specs/_playbook/settings.md", `---\ndocs: main\nboard:\n  record: on${people}\n---\n`);
}

// The files of a joined spec: its progress.md is the stub, and each phase keeps only its prose.
export function joinedFiles(target: Writable, phases: readonly PhaseDoc[], spec = "alpha"): void {
  target.write(`docs/specs/${spec}/CLAUDE.md`, "---\nstatus: active\n---\n# Alpha\n");
  target.write(`docs/specs/${spec}/progress.md`, JOINED_STUB);
  target.write(`docs/specs/${spec}/ledger/INDEX.md`, "# Ledger\n");
  for (const phase of phases) target.write(`docs/specs/${spec}/${phase.file}`, `# Phase ${phase.id}\n\n**Goal:** ${phase.id}.\n`);
}
