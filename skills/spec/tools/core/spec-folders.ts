import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export interface SpecFolder {
  name: string;
  dir: string;
}

export interface SpecFileLocation {
  spec: SpecFolder;
  pathInSpec: string;
}

const TOP_SPEC_ROOT = "docs/specs";
const NESTED_SPEC_ROOT = "*/docs/specs";
const SPEC_ROOT_PATTERNS = [`${TOP_SPEC_ROOT}/*/CLAUDE.md`, `${NESTED_SPEC_ROOT}/*/CLAUDE.md`];
const SPEC_FILE_PATTERN = /^(.*\/docs\/specs\/)([^/]+)\/(.+)$/;
// Same two roots as SPEC_ROOT_PATTERNS, for repo-relative paths as git prints them.
const SPEC_DOC_PATH = /^(?:[^/]+\/)?docs\/specs\/./;
const RESERVED_PREFIX = "_";

export function listSpecs(projectDir: string): SpecFolder[] {
  const found: SpecFolder[] = [];
  for (const pattern of SPEC_ROOT_PATTERNS) {
    for (const match of new Bun.Glob(pattern).scanSync({ cwd: projectDir })) {
      const dir = join(projectDir, dirname(match));
      const name = basename(dir);
      if (!name.startsWith(RESERVED_PREFIX)) found.push({ name, dir });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

// The spec roots present on disk, repo-relative. Literal pathspecs keep `git status` from walking every
// untracked directory the way a `*/docs/specs/**` glob does (0.36 s vs 0.03 s per CRM worktree).
export function specRoots(projectDir: string): string[] {
  if (!existsSync(projectDir)) return [];
  const nested = [...new Bun.Glob(NESTED_SPEC_ROOT).scanSync({ cwd: projectDir, onlyFiles: false })].sort();
  return existsSync(join(projectDir, TOP_SPEC_ROOT)) ? [TOP_SPEC_ROOT, ...nested] : nested;
}

export function findSpecs(projectDir: string, name: string): SpecFolder[] {
  return listSpecs(projectDir).filter((spec) => spec.name === name);
}

export function resolveSpec(projectDir: string, name: string): SpecFolder | string {
  const specs = findSpecs(projectDir, name);
  const [spec] = specs;
  if (!spec) return `no spec named ${name}`;
  if (specs.length > 1) return `${specs.length} specs are named ${name}; run from the project that holds the one you mean`;
  return spec;
}

export function locateSpecFile(filePath: string): SpecFileLocation | undefined {
  const match = SPEC_FILE_PATTERN.exec(filePath);
  if (!match) return undefined;
  const [, rootWithSlash, name, pathInSpec] = match;
  if (!rootWithSlash || !name || !pathInSpec || name.startsWith(RESERVED_PREFIX)) return undefined;
  return { spec: { name, dir: rootWithSlash + name }, pathInSpec };
}

export function isSpecDocPath(repoRelative: string): boolean {
  return SPEC_DOC_PATH.test(repoRelative);
}
