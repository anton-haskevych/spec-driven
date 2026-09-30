import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { SpecFolder } from "../core/spec-folders";

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
