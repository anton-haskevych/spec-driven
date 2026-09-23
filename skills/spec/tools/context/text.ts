export function truncate(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat;
}

export function clip(text: string, limit: number, where: string): string {
  if (text.length <= limit) return text.trimEnd();
  return `${text.slice(0, limit).trimEnd()}\n\n[clipped at ${limit} characters; read ${where} for the rest]`;
}

export function kilobytes(text: string): string {
  return `${Math.max(1, Math.round(text.length / 1024))} KB`;
}
