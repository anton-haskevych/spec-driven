import type { Check, PrView } from "../pr/checks/types";

export function prView({ checks = [], ...overrides }: Partial<PrView> = {}): PrView {
  return {
    number: 875,
    state: "OPEN",
    isDraft: false,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    headRefOid: "08bb7dbd47fa14537ef4",
    url: "https://github.com/acme/app/pull/875",
    checks,
    ...overrides,
  };
}

export function check(overrides: Partial<Check> = {}): Check {
  return { name: "Backend Tests", bucket: "pass", workflow: "CI", link: "", ...overrides };
}

export interface PhaseSketch {
  id: string;
  title: string;
  pr?: string;
  outcome?: string;
  code?: false;
}

// A spec's progress.md and phase files, enough for PR groups, titles and Outcome lines.
export function phasedSpecFiles(phases: readonly PhaseSketch[]): Record<string, string> {
  const pointer = (phase: PhaseSketch) => `phases/phase-${phase.id}.md`;
  const progress = phases.map((phase) => `- [ ] Phase ${phase.id} — ${phase.title} → \`${pointer(phase)}\``).join("\n");
  const entries = phases.map((phase) => {
    const edges = [`needs: []`, ...(phase.pr ? [`pr: ${phase.pr}`] : []), ...(phase.code === false ? ["code: false"] : [])];
    const outcome = phase.outcome ? `**Outcome:** ${phase.outcome}\n\n` : "";
    return [pointer(phase), `---\n${edges.join("\n")}\n---\n\n# Phase ${phase.id} — ${phase.title}\n\n**Goal:** Build ${phase.title}.\n\n${outcome}## Deliverables\n\n- [ ] it\n`] as const;
  });
  return { "progress.md": `# Progress\n\n## Phases\n\n${progress}\n`, ...Object.fromEntries(entries) };
}
