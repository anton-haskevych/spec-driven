const TASK_ID = /^(.*)\.(\d+)$/;

// "3.4", "3.4 and 3.5", "3.1–3.3" for a run of three or more, "2.1, 3.4 and 3.5" otherwise.
export function listIds(ids: readonly string[]): string {
  if (ids.length >= 3 && isRun(ids)) return `${ids[0]}–${ids.at(-1)}`;
  if (ids.length <= 1) return ids[0] ?? "no tasks";
  return `${ids.slice(0, -1).join(", ")} and ${ids.at(-1)}`;
}

function isRun(ids: readonly string[]): boolean {
  const parts = ids.map((id) => TASK_ID.exec(id));
  return parts.every((part, index) => {
    const first = parts[0];
    return part !== null && first !== null && first !== undefined && part[1] === first[1] && Number(part[2]) === Number(first[2]) + index;
  });
}
