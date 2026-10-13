import { appendFileSync } from "node:fs";
import type { Runner } from "../core/run";
import type { SessionLaunch } from "./command-line";

export interface BackgroundSession {
  id: string;
  name: string;
}

// The overseer's workers: background sessions that skip permission prompts and carry the brief in their
// system prompt for life. `claude stop` must end the shells they started, so their exit hands none over.
export function launchInBackground(launch: SessionLaunch, brief: string, briefNotes: readonly string[], runner: Runner): string {
  if (briefNotes.length > 0) appendFileSync(brief, `\n${briefNotes.join("\n")}\n`);
  const result = runner.run(backgroundArgv(launch, brief), { cwd: launch.projectDir, env: { CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF: "1" } });
  if (result.code !== 0) return `launch: claude --bg failed: ${firstLine(result.stderr) ?? `exit ${result.code}`}`;
  const session = parseBackgrounded(result.stdout);
  if (!session) return `launch: claude --bg printed no session id: ${firstLine(result.stdout) ?? "(nothing)"}`;
  return `Launched: background ${session.id} · ${launch.title}`;
}

function backgroundArgv(launch: SessionLaunch, brief: string): string[] {
  return ["claude", "--bg", "-n", launch.title, "--permission-mode", "bypassPermissions", "--append-system-prompt-file", brief, launch.prompt];
}

// `--session-id` is ignored with `--bg`, so the id is read back from `backgrounded · <id> · <name>`;
// the first launch after the service was down prints `Starting background service…` above it.
export function parseBackgrounded(stdout: string): BackgroundSession | undefined {
  const match = /^backgrounded · (\S+) · (.+)$/m.exec(stdout);
  return match?.[1] && match[2] ? { id: match[1], name: match[2].trim() } : undefined;
}

function firstLine(text: string): string | undefined {
  return text.trim().split("\n")[0] || undefined;
}
