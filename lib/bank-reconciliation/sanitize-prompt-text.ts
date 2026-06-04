/**
 * Sanitize untrusted text before inclusion in LLM prompts.
 * Reduces prompt-injection surface (section breaks, control chars, unbounded length).
 */
const DEFAULT_MAX_LENGTH = 500;

export function sanitizePromptText(
  value: string | null | undefined,
  maxLength: number = DEFAULT_MAX_LENGTH
): string {
  if (!value) {
    return "";
  }

  let sanitized = value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  // Collapse delimiter-like sequences that could spoof prompt sections
  sanitized = sanitized.replace(/={3,}/g, "===");
  sanitized = sanitized.replace(/^---+$/gm, "---");

  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.slice(0, maxLength)}…`;
  }

  return sanitized;
}
