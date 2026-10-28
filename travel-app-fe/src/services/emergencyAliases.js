// Multilingual place names → country, for the Emergency search (ADR-006).
// 37k aliases are ~230 kB gzipped, so they're a static, long-cached JSON file
// loaded on first use instead of part of the Emergency page's JavaScript.
// The service worker precaches the file, so search keeps working offline.
// Format: { version, countries: string[], aliases: [name, countryIndex][] }.
export const EMERGENCY_ALIASES_URL = `${import.meta.env.BASE_URL}data/emergency-aliases.v1.json`;

let pending = null;

export function loadEmergencyAliases() {
  if (!pending) {
    pending = fetch(EMERGENCY_ALIASES_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Place names unavailable (${response.status})`);
        }
        return response.json();
      })
      .then(({ countries = [], aliases = [] }) => {
        const list = aliases.map(([name, index]) => ({
          name,
          nameLower: name.toLowerCase(),
          country: countries[index],
        }));
        // Names are unique (case-insensitive) in the file.
        const lookup = new Map(list.map((alias) => [alias.nameLower, alias.country]));
        return { list, lookup };
      })
      .catch((error) => {
        pending = null; // allow a retry, e.g. after reconnecting
        throw error;
      });
  }
  return pending;
}

// Test hook: forget a loaded or failed list.
export function resetEmergencyAliases() {
  pending = null;
}
