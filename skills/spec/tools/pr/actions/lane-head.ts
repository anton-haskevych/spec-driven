import { DEFAULT_PR_GROUP } from "../../plan/docs/pr-doc";
import { branchOf, laneOf, type SpecLayout } from "../groups";

// In spec-branch mode a PR opens from feat/<spec> (the final PR) or a ship-alone group; a lane's work reaches the
// final PR through merge-back, so a PR from it would carry its phases twice.
export function laneHeadRefusal(layout: SpecLayout, head: string): string | undefined {
  if (laneOf(layout, head) === undefined) return undefined;
  return `pr open: ${layout.spec} ships from ${branchOf(layout, DEFAULT_PR_GROUP)}; ${head} is a lane, its work reaches the PR through merge-back`;
}
