import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import type { GhClient } from "../pr/gh";
import type { PhaseDoc } from "./docs/phase-doc";
import { diskReader } from "../core/spec-state";
import { prSeenOf } from "./pr-observed";
import { specCardSeed } from "../cards/spec-card";
import { notesFromFiles } from "./upgrade-notes";
import { prDocsFromFiles, specFieldsFromFiles, type CopiedFromFiles } from "./upgrade";

// `left`: PR numbers the files link that no group could take.
export function copyFromFolder(dir: string, spec: string, phases: readonly PhaseDoc[], gh: GhClient | undefined): CopiedFromFiles & { left: string[] } {
  const claudeMd = readTextIfExists(join(dir, "CLAUDE.md")) ?? "";
  const fields = specFieldsFromFiles(claudeMd);
  const seen = (number: number) => {
    const view = gh?.prView(number);
    return view?.ok ? prSeenOf(view.value) : undefined;
  };
  const { prs, left } = prDocsFromFiles(spec, phases, readTextIfExists(join(dir, "pr-opening.md")) ?? "", seen);
  return { fields, prs, notes: notesFromFiles(diskReader(dir), phases), card: specCardSeed(claudeMd, spec), left };
}
