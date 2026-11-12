import { GATE_KINDS, isGateKind } from "../../core/gate";
import type { PhaseFields } from "../../phases/set";
import { renderWritten } from "../../plan/phase-writer";
import { idList, parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const SET_USAGE = 'phase set <spec> <phase> [--needs a,b|none] [--needs-deployed a,b|none] [--same-files-as a,b|none] [--pr X|none] [--gate design|outward|none] [--title "<title>"] [--outcome "<sentence>"]';

const OPTIONS = { needs: { type: "string" }, "needs-deployed": { type: "string" }, "same-files-as": { type: "string" }, pr: { type: "string" }, gate: { type: "string" }, title: { type: "string" }, outcome: { type: "string" } } as const;
const NONE = "none";

export function phaseSet(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, OPTIONS);
  const [specName, phase] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase) return `usage: ${SET_USAGE}`;
  const fields = fieldsOf(parsed.values);
  if (typeof fields === "string") return `phase set: ${fields}`;
  if (Object.keys(fields).length === 0) return `usage: ${SET_USAGE}`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase set: ${writer}`;
  return renderWritten("set", writer.set({ phase, fields }));
}

function fieldsOf(values: { needs?: string; "needs-deployed"?: string; "same-files-as"?: string; pr?: string; gate?: string; title?: string; outcome?: string }): PhaseFields | string {
  const gate = values.gate === undefined || values.gate === NONE || isGateKind(values.gate) ? values.gate : undefined;
  if (values.gate !== undefined && gate === undefined) return `--gate must be ${GATE_KINDS.join(", ")} or none, not "${values.gate}"`;
  const title = values.title?.trim();
  if (values.title !== undefined && !title) return "--title can't be empty";
  return {
    ...(values.needs !== undefined ? { needs: ids(values.needs) } : {}),
    ...(values["needs-deployed"] !== undefined ? { needsDeployed: ids(values["needs-deployed"]) } : {}),
    ...(values["same-files-as"] !== undefined ? { sameFilesAs: ids(values["same-files-as"]) } : {}),
    ...(values.pr !== undefined ? { pr: values.pr === NONE ? null : values.pr.trim() } : {}),
    ...(gate !== undefined ? { gate: gate === NONE ? null : gate } : {}),
    ...(title ? { title } : {}),
    ...(values.outcome !== undefined ? { outcome: values.outcome.trim() } : {}),
  };
}

function ids(raw: string): string[] {
  return raw === NONE ? [] : idList(raw);
}
