import { parseArgs } from "node:util";
import { systemRunner } from "../../core/run";
import { systemClock } from "../../pr/babysit/poll";
import { openPr, type OpenDeps } from "../../pr/actions/open";

export const PR_OPEN_USAGE = "pr open <spec-name> [<group>] [--draft]";

const systemDeps: OpenDeps = { runner: systemRunner, clock: systemClock, now: () => new Date() };

export async function prOpen(projectDir: string, args: readonly string[], deps: OpenDeps = systemDeps): Promise<string> {
  const parsed = parseOpenArgs(args);
  if (!parsed) return `usage: ${PR_OPEN_USAGE}`;
  return openPr(projectDir, parsed, deps);
}

function parseOpenArgs(args: readonly string[]): { spec: string; group?: string; draft: boolean } | undefined {
  try {
    const { values, positionals } = parseArgs({ args: [...args], options: { draft: { type: "boolean" } }, allowPositionals: true, strict: true });
    const [spec, group, ...extra] = positionals;
    if (spec === undefined || extra.length > 0) return undefined;
    return { spec, ...(group === undefined ? {} : { group }), draft: values.draft ?? false };
  } catch {
    return undefined;
  }
}
