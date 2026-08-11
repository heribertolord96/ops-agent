import { createHash } from "node:crypto";

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function md5(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

/** Qdrant accepts UUID-shaped point ids; derive one from stable parts. */
export function deterministicPointId(...parts: string[]): string {
  const hex = createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
