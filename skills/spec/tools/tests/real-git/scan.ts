import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

const COLLECTED = "**/*{.test,_test,.spec,_spec}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}";
export const TEST_SUFFIX = /\.test\.ts$/;
const CODE_FILE = /\.[cm]?[jt]sx?$/;
const SHEBANG = /^#!.*/;

export function testFilesUnder(dir: string): string[] {
  return [...new Bun.Glob(COLLECTED).scanSync({ cwd: dir })].filter((path) => !path.split("/").includes("fixtures")).map((path) => join(dir, path));
}

export interface ImportScanner {
  reaches(file: string, targets: readonly string[]): boolean;
}

// scanImports drops type-only imports, so a test that only borrows a type stays fast.
export function importScanner(projectRoot: string): ImportScanner {
  const root = realpathSync(projectRoot);
  const transpiler = new Bun.Transpiler({ loader: "tsx" });
  const importsCache = new Map<string, string[]>();

  const importsOf = (file: string): string[] => {
    const cached = importsCache.get(file);
    if (cached) return cached;
    const source = readFileSync(file, "utf8").replace(SHEBANG, "");
    const resolved = transpiler.scanImports(source).flatMap(({ path }) => resolveInside(root, path, dirname(file)));
    importsCache.set(file, resolved);
    return resolved;
  };

  return {
    reaches(entry, targetPaths) {
      const file = realpathSync(entry);
      const targets = targetPaths.map((target) => realpathSync(target));
      const seen = new Set<string>([file]);
      const queue = [file];
      for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
        for (const imported of importsOf(next)) {
          if (targets.includes(imported)) return true;
          if (!seen.has(imported)) seen.add(imported), queue.push(imported);
        }
      }
      return false;
    },
  };
}

function resolveInside(root: string, specifier: string, fromDir: string): string[] {
  try {
    const resolved = Bun.resolveSync(specifier, fromDir);
    return resolved.startsWith(`${root}/`) && !resolved.includes("/node_modules/") && CODE_FILE.test(resolved) ? [resolved] : [];
  } catch {
    return [];
  }
}
