import "server-only";

export function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
