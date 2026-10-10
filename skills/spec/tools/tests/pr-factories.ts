import type { Check, PrView } from "../pr/checks/types";

export function prView({ checks = [], ...overrides }: Partial<PrView> = {}): PrView {
  return { number: 875, state: "OPEN", isDraft: false, mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", headRefOid: "08bb7dbd47fa14537ef4", checks, ...overrides };
}

export function check(overrides: Partial<Check> = {}): Check {
  return { name: "Backend Tests", bucket: "pass", workflow: "CI", link: "", ...overrides };
}
