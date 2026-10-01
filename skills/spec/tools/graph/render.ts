import type { Link } from "./neighborhood";
import type { Overlap } from "./overlap";

const LABELS: Record<Link["type"], string> = {
  "part-of": "part of",
  child: "child",
  needs: "needs",
  "needed-by": "needed by",
  supersedes: "supersedes",
  "superseded-by": "superseded by",
  related: "related",
};

export function renderLinks(links: readonly Link[], overlaps: readonly Overlap[], inFlight: ReadonlyMap<string, string> = new Map()): string {
  if (links.length === 0 && overlaps.length === 0) return "(no relations declared)";
  const lines = links.map((link) => {
    const target = `${link.other}${link.phases ? `#${link.phases}` : ""}`;
    const state = link.type === "needs" ? (link.open ? "  NOT DONE (blocks)" : "  done") : "";
    const note = link.note ? `  (${link.note})` : "";
    return `- ${LABELS[link.type]}: ${target}${state}${note}${inFlightNote(link.other, inFlight)}`;
  });
  const overlapLines = overlaps.map(
    (overlap) =>
      `- overlap?: ${overlap.other} shares ${overlap.shared.slice(0, 3).join(", ")} and no relation is declared${inFlightNote(overlap.other, inFlight)}`,
  );
  return [...lines, ...overlapLines].join("\n");
}

function inFlightNote(spec: string, inFlight: ReadonlyMap<string, string>): string {
  const holder = inFlight.get(spec);
  return holder ? `  (in flight: ${holder})` : "";
}
