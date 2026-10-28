// Only parse fields made entirely of telephone numbers and explicit separators.
// Explanatory text and location-specific entries must never become dial targets.
export function emergencyDialNumbers(value) {
  if (typeof value !== "string") return [];
  const parts = value.trim().split(/\s*(?:\bor\b|\band\b|\/|,)\s*/i);
  if (!parts.length || parts.some((part) => !/^\+?\d[\d\s-]*$/.test(part))) return [];
  return [...new Set(parts.map((part) => part.replace(/[\s-]/g, "")))];
}
