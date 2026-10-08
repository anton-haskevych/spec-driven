import { parseLaunchTitle } from "../launch/title";
import type { LiveSession } from "../sessions/live";
import { ownerOf } from "../workspaces/owner";
import type { BoardInputs } from "./inputs";

export interface Attribution {
  bySpec: Map<string, LiveSession[]>;
  unattributed: LiveSession[];
}

type AttributionInputs = Pick<BoardInputs, "nodes" | "claims" | "workspaces" | "worktreePaths">;

// Ordered and conservative (ledger: principle-session-attribution-scope-and-order): this repo's
// sessions only; then claim → launch title → a non-main tree touching exactly one focus spec.
export function attributeSessions(sessions: readonly LiveSession[], inputs: AttributionInputs, focusSpecs: ReadonlySet<string>): Attribution {
  const treeSpecs = singleFocusTrees(inputs, focusSpecs);
  const attribution: Attribution = { bySpec: new Map(), unattributed: [] };
  for (const session of sessions) {
    const tree = ownerOf(session.cwd, inputs.worktreePaths);
    if (tree === undefined) continue;
    const spec = claimedSpec(session, inputs) ?? launchedSpec(session, inputs) ?? treeSpecs.get(tree);
    if (spec !== undefined && focusSpecs.has(spec)) attribution.bySpec.set(spec, [...(attribution.bySpec.get(spec) ?? []), session]);
    else attribution.unattributed.push(session);
  }
  return attribution;
}

function claimedSpec(session: LiveSession, { claims }: AttributionInputs): string | undefined {
  return claims.find((held) => held.status !== "remote" && held.claim.sessionId === session.sessionId)?.claim.spec;
}

function launchedSpec(session: LiveSession, { nodes }: AttributionInputs): string | undefined {
  const title = session.name === undefined ? undefined : parseLaunchTitle(session.name);
  return title && nodes.has(title.spec) ? title.spec : undefined;
}

// The main checkout collects prep and idea edits for many specs, so it never stands for one.
function singleFocusTrees({ workspaces }: AttributionInputs, focusSpecs: ReadonlySet<string>): Map<string, string> {
  const trees = new Map<string, string>();
  for (const workspace of workspaces) {
    const touched = [...workspace.states.keys()].filter((spec) => focusSpecs.has(spec));
    if (!workspace.isMain && touched.length === 1 && touched[0]) trees.set(workspace.path, touched[0]);
  }
  return trees;
}
