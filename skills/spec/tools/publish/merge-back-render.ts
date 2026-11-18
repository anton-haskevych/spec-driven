import type { LaneMerge, LanePush, LaneRef } from "./merge-back";
import { previewPaths } from "./push";

export interface LaneGates {
  perCommit?: string;
  afterMergeMain?: string;
}

// Tools expand gates, never run them: the worker runs these between `merge-back` and `merge-back --push`.
export function laneMergeLines(lane: LaneRef, merged: LaneMerge, gates: LaneGates): string[] {
  const { spec, branch, specBranch, defaultBranch } = lane;
  if (merged.kind === "refused") return [`merge-back: ${merged.reason}`];
  if (merged.kind === "conflict") return [`merge-back: ${branch} conflicts with ${merged.with} in ${previewPaths(merged.paths)}; resolve it here, commit, then merge-back ${spec} again`];
  if (merged.specBranch === 0 && merged.main === 0) return [`${branch} already holds ${specBranch} and ${defaultBranch} · merge-back ${spec} --push`];
  const came = [...(merged.specBranch > 0 ? [`${specBranch} (+${merged.specBranch})`] : []), ...(merged.main > 0 ? [`${defaultBranch} (+${merged.main})`] : [])];
  const names = [...(merged.main > 0 && gates.afterMergeMain ? [gates.afterMergeMain] : []), ...(gates.perCommit ? [gates.perCommit] : [])];
  const unique = [...new Set(names)];
  const step = unique.length > 0 ? `run the ${unique.join(" and ")} gate${unique.length === 1 ? "" : "s"} above, commit` : "check it, commit any fixes";
  return [...unique.map((name) => `Gate: spec.ts gates --name ${name}`), `Merged ${came.join(" and ")} into ${branch} · ${step}, then merge-back ${spec} --push`];
}

export function lanePushLines(lane: LaneRef, pushed: LanePush): string[] {
  const { spec, branch, specBranch, defaultBranch } = lane;
  if (pushed.kind === "refused") return [`merge-back: ${pushed.reason}`];
  if (pushed.kind === "moved") return [`merge-back: ${specBranch} moved; run merge-back ${spec} again`];
  const landed = pushed.commits > 0 ? `Merged back: ${branch} → ${specBranch} (+${pushed.commits})` : `Merged back: ${specBranch} already holds ${branch}`;
  const { docs } = pushed;
  if (!docs) return [landed];
  if (!docs.ok) return [landed, `merge-back: docs not published (${docs.reason}); the next merge-back ${spec} --push retries it`];
  return [`${landed} · ${docs.value.kind === "published" ? `docs published to ${defaultBranch}` : "no new spec docs"}`];
}
