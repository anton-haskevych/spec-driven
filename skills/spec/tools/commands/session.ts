import { gitAt } from "../core/git";
import { defaultBranch } from "../core/run";
import { boardBase } from "../plan/board-base";
import { validateRecordDoc } from "../plan/kinds";
import type { PhaseDeps } from "../plan/phase-writer";
import { gitRecordPort } from "../record/ref";
import { writeRecord, type RecordPlan } from "../record/write";
import { once, sessionFactsOf, treeFolder } from "../sessions/facts";
import { SESSION_MODES, type SessionMode } from "../sessions/session-doc";
import { stampSession, type SessionChange } from "../sessions/stamp";
import { hostname } from "node:os";
import { NO_DEFAULT_BRANCH } from "./push";
import { parseFlags } from "./phase/args";
import { systemPhaseDeps } from "./phase/context";

export const SESSION_USAGE = 'session register <prep|create|review|execute|babysit|overseer> <spec> [--title "<text>"]';

const SPEC_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Prep, create and review take no claim, so this is how the sessions on a spec learn one is changing its plan.
// Never queued: a registration is only worth showing while it is true.
export async function sessionCommand(projectDir: string, args: readonly string[], deps: PhaseDeps = systemPhaseDeps()): Promise<string> {
  const [action, ...rest] = args;
  const parsed = parseFlags(rest, { title: { type: "string" } });
  const [mode, spec] = parsed?.positionals ?? [];
  if (action !== "register" || !parsed || parsed.positionals.length !== 2 || !isMode(mode) || !spec || !SPEC_NAME.test(spec)) return `usage: ${SESSION_USAGE}`;
  const title = parsed.values.title?.trim();
  return register(projectDir, deps, { mode, spec, ...(title ? { title } : {}) });
}

function isMode(value: string | undefined): value is SessionMode {
  return (SESSION_MODES as readonly (string | undefined)[]).includes(value);
}

async function register(projectDir: string, deps: PhaseDeps, change: Required<Pick<SessionChange, "mode" | "spec">> & SessionChange): Promise<string> {
  const git = gitAt(projectDir, deps.runner);
  const tree = treeFolder(git, projectDir);
  const facts = once(() => sessionFactsOf(git, deps.env, tree, hostname()))();
  if (!facts) return "session: nothing registered; this session has no id";
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return `session: nothing registered. ${NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written")}`;
  const port = gitRecordPort(git);
  if (!port) return "session: nothing registered. This repo has no origin; the board's record lives there.";
  const base = await boardBase(git, branch, "a registration");
  if (!base.ok) return `session: nothing registered. ${base.reason}`;
  const plan: RecordPlan = (view) => ({ ops: stampSession(view, facts, deps.now(), change), message: `record: ${change.mode} session on ${change.spec}` });
  const written = await writeRecord(port, plan, { validate: validateRecordDoc });
  if (written.kind === "landed") return `session: ${change.mode} ${change.spec} registered (${facts.ref.id} in ${tree})`;
  if (written.kind === "offline") return `session: nothing registered. Can't reach origin (${written.reason}).`;
  return `session: nothing registered. ${written.kind === "refused" || written.kind === "failed" ? written.reason : written.kind}`;
}
