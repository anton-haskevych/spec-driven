import { oneOf } from "../../core/read-fields";
import { PRIORITIES, type Priority } from "../../core/schedule";
import type { PhaseDeps } from "../../plan/phase-writer";
import { COMMITMENTS, type Commitment } from "../../cards/card-doc";
import type { OriginQuote } from "../../cards/plans";
import { parseFlags } from "../phase/args";
import { quoteDefaults } from "./send";

const TEXT = { type: "string" } as const;

export const QUOTE_FLAGS = { quote: TEXT, app: TEXT, person: TEXT, at: TEXT, ref: TEXT, "ref-url": TEXT } as const;
export const FIELD_FLAGS = { title: TEXT, commitment: TEXT, status: TEXT, priority: TEXT, due: TEXT, assignee: TEXT, note: TEXT } as const;
const CARD_FLAGS = { ...QUOTE_FLAGS, ...FIELD_FLAGS, role: TEXT, tag: { type: "string", multiple: true }, "if-version": TEXT } as const;

export function cardFlags(args: readonly string[]) {
  return parseFlags(args, CARD_FLAGS);
}

export type CardFlags = NonNullable<ReturnType<typeof cardFlags>>;

// The words and where they were heard; without --ref or --at, this session and now.
export function originOf(flags: CardFlags, deps: Pick<PhaseDeps, "env" | "now">): OriginQuote | string {
  const { values } = flags;
  if (!values.quote?.trim() || !values.app?.trim()) return "A card's words come with it: pass --quote \"<their exact words>\" and --app <where they said it>.";
  const defaults = quoteDefaults(deps.env, deps.now());
  return {
    app: values.app.trim(),
    ...(values.person ? { person: values.person } : {}),
    occurredAt: values.at ?? defaults.occurredAt,
    quote: values.quote,
    ref: values.ref ?? defaults.ref,
    ...(values["ref-url"] ? { refUrl: values["ref-url"] } : {}),
  };
}

export function choices(values: CardFlags["values"]): { commitment?: Commitment; priority?: Priority } | string {
  const problems: string[] = [];
  const commitment = oneOf(values.commitment, COMMITMENTS, "--commitment", problems);
  const priority = oneOf(values.priority?.toLowerCase(), PRIORITIES, "--priority", problems);
  if (problems.length > 0) return problems.join("; ");
  return { ...(commitment ? { commitment } : {}), ...(priority ? { priority } : {}) };
}
