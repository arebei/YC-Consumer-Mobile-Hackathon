import { MAX_FLAG_CHARS } from "./config";

/** One line, trimmed, at most MAX_FLAG_CHARS characters, never half an emoji. Null when nothing is left. */
export function cleanFlag(text: string): string | null {
  const oneLine = text.replace(/\s+/g, " ").trim();
  const cut = Array.from(oneLine).slice(0, MAX_FLAG_CHARS).join("").trim();
  return cut.length > 0 ? cut : null;
}
