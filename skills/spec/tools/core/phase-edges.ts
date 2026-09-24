import type { FrontmatterData } from "./frontmatter";

export interface PhaseEdges {
  declared: boolean;
  needs: string[];
  needsDeployed: string[];
  sameFilesAs: string[];
  pr?: string;
}

const EDGE_KEYS = ["needs", "needs-deployed", "same-files-as", "pr"];

export function parsePhaseEdges(data: FrontmatterData | undefined): PhaseEdges {
  if (!data) return { declared: false, needs: [], needsDeployed: [], sameFilesAs: [] };
  const pr = data.pr;
  return {
    declared: EDGE_KEYS.some((key) => key in data),
    needs: refList(data.needs),
    needsDeployed: refList(data["needs-deployed"]),
    sameFilesAs: refList(data["same-files-as"]),
    pr: typeof pr === "string" || typeof pr === "number" ? String(pr) : undefined,
  };
}

function refList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return items
    .filter((item) => typeof item === "string" || typeof item === "number")
    .map((item) => String(item).replace(/^phase\s+/i, "").trim())
    .filter((item) => item !== "" && item.toLowerCase() !== "none");
}
