import { PR_LOG_USAGE, prLog } from "./pr/log";
import { PR_OPEN_USAGE, prOpen } from "./pr/open";
import { PR_STATUS_USAGE, prStatus } from "./pr/status";

interface PrAction {
  usage: string;
  run(projectDir: string, args: readonly string[]): string | Promise<string>;
}

const ACTIONS: Record<string, PrAction> = {
  status: { usage: PR_STATUS_USAGE, run: (dir, args) => prStatus(dir, args) },
  log: { usage: PR_LOG_USAGE, run: (dir, args) => prLog(dir, args) },
  open: { usage: PR_OPEN_USAGE, run: (dir, args) => prOpen(dir, args) },
};

export const PR_USAGE = Object.values(ACTIONS)
  .map((action) => action.usage)
  .join(" | ");

export function prCommand(projectDir: string, args: readonly string[]): string | Promise<string> {
  const [name, ...rest] = args;
  const action = name !== undefined && Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
  return action ? action.run(projectDir, rest) : `usage: ${PR_USAGE}`;
}
