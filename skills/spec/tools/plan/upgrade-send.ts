import { isoTimestamp } from "../core/schedule";
import { findSpecs, resolveSpec } from "../core/spec-folders";
import type { Runner } from "../core/run";
import { baseProject } from "../mainline/load";
import { ghClient } from "../pr/gh";
import { originTip } from "../publish/snapshot";
import { RECORD_LAYOUT } from "../record/layout";
import { writeRecord } from "../record/write";
import { validateRecordDoc } from "./kinds";
import type { RecordWorld } from "./record-send";
import type { JoinedPlan } from "./state-source";
import { upgradePlan } from "./upgrade";
import { copyFromFolder } from "./upgrade-read";

// A spec joined under an older layout is upgraded by the first command that writes it, before that command's
// own change. Never queued: offline, the next online write upgrades it. `left` names PR numbers no group took.
export async function upgradeIfBehind(world: RecordWorld, projectDir: string, joined: JoinedPlan, runner: Runner): Promise<string[]> {
  if (joined.spec.layout >= RECORD_LAYOUT) return [];
  const spec = joined.spec.name;
  const dir = await specFilesDir(world, projectDir, spec);
  if (dir === undefined) return [`upgrade: no files for ${spec} here; it stays on layout ${joined.spec.layout}`];
  if (!world.port) return [];
  const { left, ...copied } = copyFromFolder(dir, spec, joined.phases, ghClient(projectDir, runner));
  const written = await writeRecord(world.port, upgradePlan(spec, copied, isoTimestamp(world.now)), { validate: validateRecordDoc });
  const failed = !["landed", "unchanged", "offline"].includes(written.kind);
  return [...left.map((line) => `upgrade: ${line}`), ...(failed ? [`upgrade: ${spec} stays on layout ${joined.spec.layout} (${written.kind}); the next write tries again`] : [])];
}

// The default branch's copy as last fetched: an owner or focus lands there, not in this tree.
async function specFilesDir(world: RecordWorld, projectDir: string, spec: string): Promise<string | undefined> {
  const tip = world.defaultBranch ? originTip(world.git, world.defaultBranch) : undefined;
  const base = tip?.ok ? await baseProject(world.git, tip.value) : undefined;
  const onBase = base?.ok ? findSpecs(base.value.dir, spec)[0] : undefined;
  if (onBase) return onBase.dir;
  const here = resolveSpec(projectDir, spec);
  return typeof here === "string" ? undefined : here.dir;
}
