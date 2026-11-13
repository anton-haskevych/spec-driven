import { join } from "node:path";
import { cardProblems } from "../cards/check";
import { RECORD_REF } from "../record/layout";
import type { RecordView } from "../record/view";
import { error, type Issue } from "./issue";

// A record document has no file in the tree: it is named by the ref it lives on.
export function recordDocFile(projectDir: string, path: string): string {
  return join(projectDir, RECORD_REF, path);
}

export function cardIssues(projectDir: string, view: RecordView | undefined): Issue[] {
  return view ? cardProblems(view).map(({ path, problem }) => error(recordDocFile(projectDir, path), problem)) : [];
}
