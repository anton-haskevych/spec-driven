import { basename, dirname, join } from "node:path";

export interface SpecFolder {
  name: string;
  dir: string;
}

export interface SpecFileLocation {
  spec: SpecFolder;
  pathInSpec: string;
}

const SPEC_ROOT_PATTERNS = ["docs/specs/*/CLAUDE.md", "*/docs/specs/*/CLAUDE.md"];
const SPEC_FILE_PATTERN = /^(.*\/docs\/specs\/)([^/]+)\/(.+)$/;
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

export function findSpecs(projectDir: string, name: string): SpecFolder[] {
  return listSpecs(projectDir).filter((spec) => spec.name === name);
}

export function locateSpecFile(filePath: string): SpecFileLocation | undefined {
  const match = SPEC_FILE_PATTERN.exec(filePath);
  if (!match) return undefined;
  const [, rootWithSlash, name, pathInSpec] = match;
  if (!rootWithSlash || !name || !pathInSpec || name.startsWith(RESERVED_PREFIX)) return undefined;
  return { spec: { name, dir: rootWithSlash + name }, pathInSpec };
}
