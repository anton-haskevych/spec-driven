import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { resolveSpec } from "../core/spec-folders";
import { formatIssues } from "../doctor/issue";
import { issuesForWrittenFile } from "../hooks/spec-file-check";

export function doctorFileReport(projectDir: string, specName: string, path: string): string {
  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `doctor: ${spec}`;
  try {
    const file = realpathSync(resolve(spec.dir, path));
    const local = relative(realpathSync(spec.dir), file);
    if (isAbsolute(path) || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) {
      return "doctor: --file requires a path inside the named spec, relative to its directory";
    }
    if (!statSync(file).isFile()) return "doctor: --file requires an existing file";
    const project = realpathSync(projectDir);
    const issues = issuesForWrittenFile(file, project);
    if (issues.length === 0) return "doctor: clean (1 file)";
    const errors = issues.filter(({ severity }) => severity === "error").length;
    return `doctor: ${errors} errors, ${issues.length - errors} warnings\n${formatIssues(issues, project)}`;
  } catch {
    return "doctor: file/check evidence unavailable; validation refused";
  }
}
