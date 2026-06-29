/**
 * Safely converts any value to an array.
 * If the value is already an array, it is returned.
 * If it is null or undefined, an empty array is returned.
 * If it is a string representing a JSON array, it will try to parse it.
 * Otherwise, it logs a warning and returns an empty array.
 */
export function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Ignore parse failure for normal strings
    }
  }
  console.warn('Warning: expected an array but received non-array value:', value);
  return [];
}
