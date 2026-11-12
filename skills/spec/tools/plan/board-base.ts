import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { baseProject } from "../mainline/load";
import { loadSettings, SETTINGS_FILE } from "../playbook/settings";
import { pinDefault } from "../publish/snapshot";

export interface BoardBase {
  tip: string;
  projectDir: string;
}

// The switch is read from the default branch, so a tree cut before it was turned on agrees.
export async function boardBase(git: Git, branch: string, neverQueued: string): Promise<Result<BoardBase>> {
  const tip = pinDefault(git, branch);
  if (!tip.ok) return { ok: false, reason: `Can't reach origin (${tip.reason}); ${neverQueued} is never queued, so run it again when origin answers.` };
  const project = await baseProject(git, tip.value);
  if (!project.ok) return project;
  const settings = loadSettings(project.value.dir);
  if (!settings.board.record) return { ok: false, reason: `The board is off here: ${SETTINGS_FILE} on ${branch} doesn't say board.record: on.` };
  if (settings.docs !== "main") return { ok: false, reason: "The board needs docs: main in this version." };
  return { ok: true, value: { tip: tip.value, projectDir: project.value.dir } };
}
