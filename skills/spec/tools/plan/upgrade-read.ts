import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import type { GhClient } from "../pr/gh";
import type { PrView } from "../pr/checks/types";
import type { PhaseDoc } from "./docs/phase-doc";
import { prDocsFromFiles, specFieldsFromFiles, type CopiedFromFiles, type PrSeen } from "./upgrade";

// `left`: PR numbers the files link that no group could take.
export function copyFromFolder(dir: string, spec: string, phases: readonly PhaseDoc[], gh: GhClient | undefined): CopiedFromFiles & { left: string[] } {
  const fields = specFieldsFromFiles(readTextIfExists(join(dir, "CLAUDE.md")) ?? "");
  const seen = (number: number) => {
    const view = gh?.prView(number);
    return view?.ok ? prSeenOf(view.value) : undefined;
  };
  const { prs, left } = prDocsFromFiles(spec, phases, readTextIfExists(join(dir, "pr-opening.md")) ?? "", seen);
  return { fields, prs, left };
}

export function prSeenOf(view: PrView): PrSeen {
  const state = view.state === "MERGED" ? "merged" : view.state === "CLOSED" ? "closed" : view.isDraft ? "draft" : "open";
  return { branch: view.headRefName, state, headRefOid: view.headRefOid, ...(view.mergeCommit ? { mergedSha: view.mergeCommit } : {}) };
}
