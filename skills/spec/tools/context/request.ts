export interface ContextRequest {
  mode: string;
  name?: string;
  hint?: string;
}

export const SUB_COMMANDS = new Set(["prep", "create", "resume", "execute", "review", "update", "handoff", "status", "list", "idea"]);

export function parseContextRequest(argv: readonly string[]): ContextRequest {
  const tokens = argv.flatMap((arg) => arg.split(/\s+/)).filter(Boolean);
  const first = tokens[0]?.toLowerCase();
  const last = tokens.at(-1)?.toLowerCase();
  if (first && SUB_COMMANDS.has(first)) return { mode: first, name: tokens[1], hint: tokens.slice(2).join(" ") || undefined };
  if (last && SUB_COMMANDS.has(last)) return { mode: last, name: tokens[0] };
  return { mode: "route", name: tokens[0] };
}
