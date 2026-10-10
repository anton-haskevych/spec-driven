const COLUMN_GAP = "  ";

export function alignColumns(rows: ReadonlyArray<readonly string[]>): string[] {
  const widths: number[] = [];
  for (const row of rows) row.forEach((cell, index) => (widths[index] = Math.max(widths[index] ?? 0, Bun.stringWidth(cell))));
  return rows.map((row) =>
    row
      .map((cell, index) => (index === row.length - 1 ? cell : cell + " ".repeat((widths[index] ?? 0) - Bun.stringWidth(cell))))
      .join(COLUMN_GAP)
      .trimEnd(),
  );
}
