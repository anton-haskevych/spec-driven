import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import type { Git } from "../core/git";
import { landOnMain, type MainLanding } from "../core/land-on-main";
import { findSpecs } from "../core/spec-folders";
import { planBanner } from "./banner";

// Lands the banner on progress.md at a freshly fetched default branch; the checkout is never touched.
export function landBanner(git: Git, branch: string, spec: string, day: string): Promise<MainLanding<true>> {
  return landOnMain(git, branch, (projectDir) => {
    const [folder] = findSpecs(projectDir, spec);
    const file = folder ? join(folder.dir, "progress.md") : undefined;
    const progress = file ? readTextIfExists(file) : undefined;
    if (!file || progress === undefined) return { kind: "refused", reason: `${spec} has no progress.md on ${branch}` };
    const planned = planBanner(progress, day);
    if (planned.kind === "unchanged") return { kind: "unchanged", reason: "the banner is already there" };
    return { kind: "write", file, text: planned.text, message: `[board] ${spec} joined the board`, landed: true };
  });
}
