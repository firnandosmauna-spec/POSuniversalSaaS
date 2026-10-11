/**
 * Guaranteed RFC4122 v4 UUID generator.
 * Works seamlessly across all environments:
 * - Modern browsers (crypto.randomUUID)
 * - Android WebView / Capacitor (where crypto.randomUUID may be undefined or unsupported in non-secure HTTP)
 * - Node.js test scripts
 *
 * Ensures IDs are ALWAYS valid PostgreSQL UUIDs to prevent error 22P02:
 * "invalid input syntax for type uuid"
 */

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID throws (e.g. non-secure context)
    }
  }

  // RFC4122 v4 UUID implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates whether a given string is a valid UUID format (v1-v5).
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim());
}
