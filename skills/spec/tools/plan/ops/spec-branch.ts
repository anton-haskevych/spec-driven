import type { RecordView } from "../../record/view";
import type { RecordPlan } from "../../record/write";
import { DEFAULT_PR_GROUP, notOpenedPrDoc, readPrDoc, type PrDoc } from "../docs/pr-doc";
import { specBranchProblems } from "../docs/spec-branch-rules";
import type { SpecBranch } from "../docs/spec-doc";
import { prDocPath, specDocPath } from "../kinds";
import { readJoinedPlan, type JoinedPlan } from "../state-source";

export interface SpecBranchIntent {
  spec: string;
  cutFrom: string;
  shipAlone: string[];
}

// Not a registered plan runner: a queued half-start could land after the cut (ledger:
// decision-spec-branch-mode-starts-and-ends-in-one-record-write), so callers land it with writeRecord.
export function specBranchPlan(intent: SpecBranchIntent): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, intent.spec);
    if (!plan) return { refused: `${intent.spec} is not on the board; spec-branch mode needs the record (spec.ts join ${intent.spec})` };
    if (plan.spec.specBranch) return { unchanged: true };
    const specBranch: SpecBranch = { cutFrom: intent.cutFrom, shipAlone: intent.shipAlone };
    const defaultDoc = defaultPrDoc(view, intent.spec);
    const problems = specBranchStartProblems(plan, specBranch, defaultDoc);
    if (problems.length > 0) return { refused: problems.join("; ") };
    const docOp = defaultDoc ? [] : [{ op: "create" as const, path: prDocPath(intent.spec, DEFAULT_PR_GROUP), doc: notOpenedPrDoc(intent.spec, DEFAULT_PR_GROUP) }];
    return {
      ops: [{ op: "update", path: specDocPath(intent.spec), patch: { specBranch } }, ...docOp],
      message: `record: spec-branch ${intent.spec} from ${intent.cutFrom.slice(0, 7)}`,
    };
  };
}

export function specBranchStartProblems(plan: JoinedPlan, specBranch: SpecBranch, defaultDoc: PrDoc | undefined): string[] {
  const spec = plan.spec.name;
  const groups = new Set(plan.phases.filter((phase) => phase.code && phase.pr !== undefined).map((phase) => phase.pr?.toLowerCase()));
  return [
    ...specBranch.shipAlone.filter((group) => !groups.has(group.toLowerCase())).map((group) => `ship-alone ${group} is not a PR group of ${spec}`),
    ...specBranchProblems({ ...plan.spec, specBranch }, plan.phases),
    ...(defaultDoc?.number === undefined ? [] : [`${spec} already shipped PR #${defaultDoc.number} as one PR; put that work under its own group first`]),
  ];
}

export function defaultPrDoc(view: RecordView, spec: string): PrDoc | undefined {
  return readPrDoc(view.doc(prDocPath(spec, DEFAULT_PR_GROUP))).doc;
}
